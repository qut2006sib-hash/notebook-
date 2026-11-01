const { test } = require("node:test");
const assert = require("node:assert/strict");
const { CSP, appFile, isAppUrl, windowOptions } = require("./policy.cjs");

test("only the application's own origin is navigable", () => {
  assert.equal(isAppUrl("midad://app/index.html"), true);
  for (const url of ["https://example.com", "file:///etc/passwd", "midad://other/index.html", "midad://user@app/a", "javascript:alert(1)", "broken"]) assert.equal(isAppUrl(url), false);
});
test("packaged file resolution rejects encoded directory traversal", () => {
  assert.equal(appFile("/opt/midad/web", "midad://app/assets/test.js"), "/opt/midad/web/assets/test.js");
  assert.equal(appFile("/opt/midad/web", "midad://app/"), "/opt/midad/web/index.html");
  for (const url of ["midad://app/%2e%2e%2fsecret", "midad://app/%00", "midad://app/%ZZ", "file:///secret", "midad://app/%5csecret"]) assert.equal(appFile("/opt/midad/web",url),null);
});
test("renderer has sandbox and isolation with no Node access", () => {
  assert.deepEqual(windowOptions("icon").webPreferences,{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,devTools:false});
});
test("CSP prevents executable remote content and application network APIs", () => {
  assert.ok(CSP.includes("script-src 'self'")); assert.ok(CSP.includes("connect-src 'none'"));
  assert.ok(CSP.includes("object-src 'none'")); assert.ok(!CSP.includes("unsafe-eval"));
});
