import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { IDBFactory } from "fake-indexeddb";
import { validateSnapshot } from "./schema.ts";
import { buildSeed } from "./seed.ts";
import { commitSnapshot, readSnapshot, SaveQueue, StorageConflict } from "./storage.ts";
import { bindPageReferences, localStudyDate, normalizeTitle, resolveReference } from "./references.ts";
import { pageToMarkdown, relatedPages, searchPages } from "./query.ts";
import type { Block, Persisted } from "./model.ts";
import { uid } from "./model.ts";

const fixture = (): Persisted => validateSnapshot(buildSeed());
let factory: IDBFactory;
let sequence = 0;
beforeEach(() => { factory = new IDBFactory(); globalThis.indexedDB = factory; });
afterEach(() => { /* Every storage operation closes its database handle. */ });
async function store() { return (await import(`./store.ts?test=${++sequence}`)).useNotebook; }
async function changeRaw(key: string, value: unknown) {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open("midad", 1);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put(value, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}

test("all demo blocks and embedded images survive a strict JSON round trip", () => {
  const data = fixture();
  assert.deepEqual(validateSnapshot(JSON.parse(JSON.stringify(data))), data);
  assert.ok(data.pages.flatMap((page) => page.blocks).some((block) => block.type === "image" && block.src.startsWith("data:")));
});

for (const [name, mutate] of [
  ["unknown schema version", (d: any) => { d.version = 2; }],
  ["duplicate page IDs", (d: any) => { d.pages.push(d.pages[0]); }],
  ["missing parent", (d: any) => { d.pages[0].sectionId = "missing"; }],
  ["cross-notebook section", (d: any) => { d.notebooks.push({ id: "other", title: "Other", order: 9 }); d.pages[0].notebookId = "other"; }],
  ["unsupported block type", (d: any) => { d.pages[0].blocks[0].type = "future"; }],
  ["malformed table", (d: any) => { d.pages[0].blocks.push({id:"bad-table",type:"table",headers:["one"],rows:[["one","two"]]}); }],
  ["non-boolean task", (d: any) => { d.pages[0].blocks.push({id:"bad-tasks",type:"tasks",items:[{id:"bad-task",text:"Q",done:"false"}]}); }],
  ["dangling link", (d: any) => { d.links.push({ id: "bad-link", fromPageId: d.pages[0].id, toPageId: "missing" }); }],
] as const) {
  test(`rejects ${name} without changing the input`, () => {
    const data = fixture(); mutate(data); const before = JSON.stringify(data);
    assert.throws(() => validateSnapshot(data)); assert.equal(JSON.stringify(data), before);
  });
}

test("a valid empty workspace remains empty", () => {
  assert.equal(validateSnapshot({version:1,notebooks:[],sections:[],pages:[],links:[],activePageId:null,view:"write"}).pages.length,0);
});
test("legacy storage starts at revision zero and only commits advance it", async () => {
  assert.deepEqual(await readSnapshot(), { data:null, revision:0, rollback:null });
  const data=fixture(); await changeRaw("state", data);
  assert.equal((await readSnapshot()).revision, 0);
  assert.equal(await commitSnapshot(data,0),1);
});
test("a stale tab cannot overwrite another tab's committed notes", async () => {
  const original=fixture(); await commitSnapshot(original,0);
  const first=structuredClone(original); first.pages[0]!.title="Tab A";
  await commitSnapshot(first,1);
  const stale=structuredClone(original); stale.pages[0]!.title="Tab B";
  await assert.rejects(commitSnapshot(stale,1),StorageConflict);
  assert.deepEqual((await readSnapshot()).data,first);
});
test("replacement and its rollback snapshot commit together", async () => {
  const original=fixture(); await commitSnapshot(original,0);
  const replacement=structuredClone(original); replacement.pages[0]!.title="Imported";
  await commitSnapshot(replacement,1,original);
  const disk=await readSnapshot(); assert.deepEqual(disk.data,replacement); assert.deepEqual(disk.rollback,original);
  await assert.rejects(commitSnapshot(original,1,replacement),StorageConflict);
  assert.deepEqual(await readSnapshot(),disk);
});
test("aborted quota transaction preserves both old workspace and rollback", async () => {
  const original=fixture(); await commitSnapshot(original,0);
  const open=factory.open.bind(factory);
  factory.open=((...args: Parameters<typeof open>) => {
    const req=open(...args);
    req.addEventListener("success",()=>{
      const db=req.result; const transaction=db.transaction.bind(db);
      db.transaction=((...txArgs: Parameters<typeof transaction>)=>{
        const tx=transaction(...txArgs);
        if(txArgs[1]==="readwrite") queueMicrotask(()=>tx.abort());
        return tx;
      }) as typeof db.transaction;
    });
    return req;
  }) as typeof factory.open;
  await assert.rejects(commitSnapshot(original,1,original));
  factory.open=open;
  assert.equal((await readSnapshot()).revision,1); assert.equal((await readSnapshot()).rollback,null);
});
test("serial writer does not acknowledge a failed save and can retry", async () => {
  const attempts:number[]=[];let fail=true;
  const writer=new SaveQueue(7,async (_data,revision)=>{ attempts.push(revision);if(fail) throw new Error("quota");return revision+1; });
  await assert.rejects(writer.commit(fixture())); assert.equal(writer.revision,7);
  fail=false; await writer.commit(fixture()); assert.equal(writer.revision,8); assert.deepEqual(attempts,[7,7]);
});
test("queued writes are ordered even when the first write is slow", async () => {
  let release!:()=>void; const gate=new Promise<void>((resolve)=>{release=resolve;}); const revisions:number[]=[];
  const writer=new SaveQueue(0,async (_data,revision)=>{if(revision===0)await gate; revisions.push(revision);return revision+1;});
  const first=writer.commit(fixture()); const second=writer.commit(fixture());release();await Promise.all([first,second]);
  assert.deepEqual(revisions,[0,1]);assert.equal(writer.revision,2);
});
test("failed initial read never writes demo notes over existing storage", async () => {
  const data=fixture();data.pages[0]!.title="Keep my notes";await commitSnapshot(data,0);
  const open=factory.open.bind(factory);factory.open=()=>{throw new Error("temporary failure");};
  const app=await store(); await app.getState().hydrate(); assert.ok(app.getState().loadError);
  factory.open=open; assert.deepEqual((await readSnapshot()).data,data);
  await app.getState().retryLoad(); assert.equal(app.getState().loadError,null);assert.equal(app.getState().pages[0].title,"Keep my notes");
});
test("invalid stored data remains intact and blocks editing", async () => {
  await readSnapshot(); const invalid={version:99,important:"keep"}; await changeRaw("state",invalid);
  const app=await store();await app.getState().hydrate();assert.ok(app.getState().loadError);
  app.getState().addNotebook("blocked");assert.equal(app.getState().notebooks.length,0);assert.deepEqual((await readSnapshot()).data,invalid);
});
test("failed autosave remains visibly unsaved and retry persists the latest edits", async () => {
  const app=await store();await app.getState().hydrate(); const id=app.getState().pages[0].id;
  const open=factory.open.bind(factory);factory.open=()=>{throw new Error("quota");};
  app.getState().updatePage(id,{title:"Latest unsaved"});assert.equal(await app.getState().flush(),false);
  assert.equal(app.getState().saveStatus,"error");assert.ok(app.getState().saveError);
  factory.open=open;assert.equal(await app.getState().flush(),true);assert.equal(app.getState().saveStatus,"saved");
  assert.equal(validateSnapshot((await readSnapshot()).data).pages[0]!.title,"Latest unsaved");
});
test("store detects conflicting writes and retains the stale tab edits for export", async () => {
  const app=await store();await app.getState().hydrate();const disk=await readSnapshot();
  const other=validateSnapshot(disk.data);other.pages[0]!.title="Other tab";await commitSnapshot(other,disk.revision);
  app.getState().updatePage(other.pages[0]!.id,{title:"My unsaved tab"});assert.equal(await app.getState().flush(),false);
  assert.equal(app.getState().saveStatus,"conflict");assert.equal(app.getState().readOnly,true);
  assert.equal(app.getState().pages[0].title,"My unsaved tab");assert.deepEqual((await readSnapshot()).data,other);
});
test("restore and rollback preserve full notebook data across reload", async () => {
  const app=await store();await app.getState().hydrate();
  const original=validateSnapshot((await readSnapshot()).data);const incoming=structuredClone(original);incoming.pages[0]!.title="Imported";
  await app.getState().restore(incoming);assert.equal(app.getState().pages[0].title,"Imported");
  await app.getState().retryLoad();assert.equal(app.getState().rollbackAvailable,true);
  await app.getState().rollback();assert.deepEqual(validateSnapshot((await readSnapshot()).data),original);
});
test("restore rejects invalid input and storage failures without replacing current notes", async () => {
  const app=await store();await app.getState().hydrate();const before=validateSnapshot((await readSnapshot()).data);
  await assert.rejects(app.getState().restore({version:1}));assert.deepEqual((await readSnapshot()).data,before);
  const open=factory.open.bind(factory);factory.open=()=>{throw new Error("quota");};
  await assert.rejects(app.getState().restore(before));factory.open=open;
  assert.equal(app.getState().busy,false);assert.deepEqual((await readSnapshot()).data,before);
});
test("page deletion can be undone with its blocks and relationships", async () => {
  const app=await store();await app.getState().hydrate();const before=validateSnapshot((await readSnapshot()).data);
  app.getState().removePage(before.pages[0]!.id);app.getState().undo();await app.getState().flush();
  assert.deepEqual(validateSnapshot((await readSnapshot()).data),before);
});
test("editing after a deletion invalidates snapshot undo instead of discarding later work", async () => {
  const app=await store();await app.getState().hydrate();
  const [deleted,remaining]=app.getState().pages;
  app.getState().removePage(deleted.id);
  app.getState().updatePage(remaining.id,{title:"Keep later edits"});
  assert.equal(app.getState().canUndo,false);
  app.getState().undo();await app.getState().flush();
  assert.equal(app.getState().pages.find((page: any)=>page.id===remaining.id)?.title,"Keep later edits");
  assert.equal(app.getState().pages.some((page: any)=>page.id===deleted.id),false);
});
test("a corrupt revision blocks writes and preserves the stored notebook", async () => {
  const original=fixture();await commitSnapshot(original,0);await changeRaw("revision","corrupt");
  const app=await store();await app.getState().hydrate();assert.ok(app.getState().loadError);
  await assert.rejects(readSnapshot());
  await changeRaw("revision",1);assert.deepEqual((await readSnapshot()).data,original);
});
test("bound title references survive renaming and do not expose IDs in text", () => {
  const data=fixture();const target=data.pages[0]!;
  const bound=bindPageReferences({id:"mention",type:"paragraph",text:`[[${target.title}]]`},data.pages);
  assert.equal((bound as {text:string}).text,`[[${target.title}]]`);
  const source={...data.pages[1]!,blocks:[bound]};const renamed={...target,title:"Renamed concept"};
  assert.ok(relatedPages(source,[source,renamed],[]).some((r)=>r.page.id===target.id));
});
test("ambiguous normalized titles never choose an arbitrary target", () => {
  const data=fixture();const pages=[{...data.pages[0]!,id:"a",title:"إسقاط"},{...data.pages[0]!,id:"b",title:"اسقاط"}];
  assert.equal(resolveReference(pages,"اسقاط"),undefined);assert.equal(normalizeTitle("إِسقاط"),"اسقاط");
});
test("study date follows Damascus midnight rather than UTC", () => {
  const previous=process.env.TZ;process.env.TZ="Asia/Damascus";
  try { assert.equal(localStudyDate(new Date("2026-10-29T00:30:00+03:00")),"2026-10-29"); }
  finally { if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous; }
});
test("page IDs work when randomUUID is unavailable in an HTTP preview", () => {
  const own = Object.getOwnPropertyDescriptor(crypto, "randomUUID");
  Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
  try {
    const ids = new Set(Array.from({length:100}, () => uid()));
    assert.equal(ids.size,100);
    for (const id of ids) assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  } finally {
    if (own) Object.defineProperty(crypto,"randomUUID",own);
    else Reflect.deleteProperty(crypto,"randomUUID");
  }
});
test("Arabic search and Markdown preserve useful content", () => {
  const data=fixture();const page={...data.pages[0]!,title:"إِسقاط",blocks:[{id:"t",type:"table",headers:["A|B"],rows:[["x\ny"]]} as Block,{id:"c",type:"code",lang:"text",text:"``` nested"} as Block]};
  assert.equal(searchPages([page],"اسقاط").length,1);
  const md=pageToMarkdown(page,[page],[]);assert.ok(md.includes("A\\|B"));assert.ok(md.includes("x<br>y"));assert.ok(md.includes("````text"));
});
