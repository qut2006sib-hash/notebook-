import type {
  Block,
  CalloutBlock,
  CalloutKind,
  CodeBlock,
  HeadingBlock,
  ImageBlock,
  MathBlock,
  Page,
  ParagraphBlock,
  Persisted,
  TableBlock,
  TasksBlock,
} from "@/lib/notebook/model";

const STAMP = "2026-10-18T09:00:00.000Z";

const PCA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="400" viewBox="0 0 720 400">
  <rect width="720" height="400" fill="#faf6ef"/>
  <g stroke="#e0d4c4" stroke-width="1">
    <line x1="56" y1="36" x2="56" y2="348"/>
    <line x1="56" y1="348" x2="684" y2="348"/>
  </g>
  <line x1="92" y1="312" x2="600" y2="78" stroke="#8f3d2b" stroke-width="2.5"/>
  <polygon points="612,64 586,78 598,102" fill="#8f3d2b"/>
  <line x1="250" y1="92" x2="430" y2="318" stroke="#1c1915" stroke-width="1.5" stroke-dasharray="5 5"/>
  <g fill="#1c1915">
    <circle cx="150" cy="286" r="6"/>
    <circle cx="196" cy="252" r="6"/>
    <circle cx="230" cy="268" r="6"/>
    <circle cx="274" cy="214" r="6"/>
    <circle cx="318" cy="198" r="6"/>
    <circle cx="352" cy="226" r="6"/>
    <circle cx="404" cy="164" r="6"/>
    <circle cx="448" cy="142" r="6"/>
    <circle cx="486" cy="168" r="6"/>
    <circle cx="530" cy="118" r="6"/>
  </g>
</svg>`;

const PCA_IMAGE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PCA_SVG)}`;

export function buildSeed(): Persisted {
  let n = 0;
  const bid = () => `b-${++n}`;
  const para = (text: string): ParagraphBlock => ({ id: bid(), type: "paragraph", text });
  const h = (text: string): HeadingBlock => ({ id: bid(), type: "heading", text, level: 2 });
  const math = (tex: string): MathBlock => ({ id: bid(), type: "math", tex });
  const code = (text: string): CodeBlock => ({ id: bid(), type: "code", text, lang: "python" });
  const note = (kind: CalloutKind, text: string): CalloutBlock => ({ id: bid(), type: "callout", kind, text });
  const tasks = (items: [string, boolean][]): TasksBlock => ({
    id: bid(),
    type: "tasks",
    items: items.map(([text, done]) => ({ id: bid(), text, done })),
  });
  const image = (alt: string): ImageBlock => ({ id: bid(), type: "image", src: PCA_IMAGE, alt });
  const table = (headers: string[], rows: string[][]): TableBlock => ({ id: bid(), type: "table", headers, rows });

  const page = (
    input: Pick<Page, "id" | "notebookId" | "sectionId" | "type" | "title" | "blocks"> &
      Partial<Pick<Page, "status" | "subject" | "source" | "studiedAt">>,
  ): Page => ({
    status: input.type === "lesson" ? "started" : null,
    subject: "",
    source: "",
    studiedAt: "2026-10-18",
    createdAt: STAMP,
    updatedAt: STAMP,
    ...input,
  });

  const pcaBlocks: Block[] = [
    h("الفكرة الأساسية"),
    para(
      "تحليل المكونات الرئيسية يعيد وصف البيانات بمحاور جديدة متعامدة، مرتبة حسب التباين الذي تحمله. أبقي المحاور الأولى حين أريد ضغط التمثيل من غير أن أتجاهل اتجاه انتشار السحابة. هذا ليس اختيار أبعاد عشوائية، ولا يستخدم تسميات الصفوف كما تفعل LDA.",
    ),
    h("التعريفات والقوانين"),
    para(
      "أطرح المتوسط من كل عمود أولاً، ثم أحسب مصفوفة التغاير. معنى التباين نفسه في [[التباين]]. إذا كانت صفوف $X$ هي العينات بعد التوسيط، فالتغاير العيني:",
    ),
    math("\\Sigma = \\frac{1}{n-1} X^{\\top} X"),
    para(
      "المتجه الذاتي لـ $\\Sigma$ المقابل لأكبر قيمة ذاتية هو المكوّن الأول. المعنى الهندسي للزوج $(\\lambda, v)$ في [[المتجهات الذاتية]]، وإسقاط عينة على المحور في [[الإسقاط]].",
    ),
    h("مثال"),
    para(
      "أربع نقاط في المستوى. بعد توسيطها أحسب القيم الذاتية بـ NumPy. الدالة np.linalg.eigh تناسب مصفوفة متماثلة وتعيد القيم تصاعدياً، لذلك أعكس الترتيب.",
    ),
    code(`import numpy as np

X = np.array([
    [2.5, 2.4],
    [0.5, 0.7],
    [2.2, 2.9],
    [1.9, 2.2],
], dtype=float)
X = X - X.mean(axis=0)
cov = np.cov(X, rowvar=False)
vals, vecs = np.linalg.eigh(cov)
order = np.argsort(vals)[::-1]
print(np.round(vals[order], 3))
print(np.round(vecs[:, order], 3))`),
    image("نقاط منتشرة على محور مائل. السهم المتصل هو المكوّن الأول، والخط المتقطع اتجاه التباين الأصغر."),
    h("أخطاء وقعت فيها"),
    note("mistake", "حسبت التغاير قبل طرح المتوسط، فدخل موقع السحابة في الحساب واختلط مركز البيانات مع اتجاه الانتشار."),
    h("لم أفهم بعد"),
    note(
      "unclear",
      "ما زلت أخلط متى أستخدم مصفوفة الارتباط بدل التغاير. إذا اختلفت وحدات الأعمدة اختلافاً كبيراً، الارتباط يمنع عموداً واسع المدى من ابتلاع المحور. أحتاج مثالاً رقمياً بوحدات مختلفة.",
    ),
    h("أسئلة لاختبار الفهم"),
    tasks([
      ["لماذا تكون المتجهات الذاتية لمصفوفة التغاير متعامدة؟", false],
      ["ماذا يتغير لو بقيت وحدات الأعمدة مختلفة ولم أطبّعها؟", false],
      ["ماذا يحدث لو لم أطرح المتوسط؟", true],
    ]),
    h("خلاصة المراجعة"),
    note(
      "summary",
      "PCA يدور المحاور نحو أكبر تباين ثم يُبقي أولها. مفاتيحي للرجوع: التباين، والمتجهات الذاتية، والإسقاط. الحالة أحددها بنفسي.",
    ),
  ];

  const varianceBlocks: Block[] = [
    h("التعريف"),
    para("التباين يقيس انتشار القيم حول متوسطها، لا موقع المتوسط نفسه. لمتغير واحد:"),
    math("\\mathrm{Var}(x) = \\mathbb{E}[(x-\\mu)^2]"),
    h("أين يظهر"),
    para(
      "في [[تحليل المكونات الرئيسية]] التباين على المحور الجديد يساوي القيمة الذاتية المقابلة. التوسيط شرط قبل هذا الحساب، وتفصيله في [[توسيط البيانات]].",
    ),
    h("مثال قصير"),
    para(
      "النقاط 1 و 3 و 5 متوسطها 3، وانحرافاتها −2 و 0 و 2. بالقسمة على $n$ يكون التباين $\\frac{8}{3}$. np.var يقسم على n افتراضياً، بينما np.cov يقسم على n−1. الفرق يغيّر المقدار لا اتجاه المحور.",
    ),
    h("خلاصة"),
    note("summary", "التباين مقدار انتشار. اتجاه أكبر انتشار هو ما يبحث عنه المكوّن الأول، لا أكبر قيمة خام في البيانات."),
  ];

  const projBlocks: Block[] = [
    h("التعريف"),
    para("إسقاط $x$ على الاتجاه $u$ هو أقرب نقطة على المستقيم الذي يولده $u$، بالتعامد الإقليدي:"),
    math("\\mathrm{proj}_{u}(x) = \\frac{x \\cdot u}{u \\cdot u} u"),
    para("وإذا كان $u$ متجه وحدة يختصر الإسقاط إلى $(x \\cdot u)\\, u$."),
    h("أين يظهر"),
    para("بعد اختيار محور في [[تحليل المكونات الرئيسية]] أكتب كل عينة بإحداثي واحد عبر هذا الإسقاط، وأحذف المركبة المتعامدة على المحور."),
    h("مثال قصير"),
    para("إسقاط $(3,1)$ على $(1,0)$ هو $(3,0)$: تبقى المركبة الأفقية وتسقط العمودية."),
    h("خلاصة"),
    note("summary", "الإسقاط يبقي المركبة الموازية للمحور ويحذف المتعامد عليه."),
  ];

  const eigenLesson: Block[] = [
    h("الفكرة الأساسية"),
    para(
      "لا أحفظ خطوات كثيرة قبل أن أرى المعنى: أبحث عن اتجاهات يكتفي التحويل بتمديدها. الحساب بعد ذلك هو حل $\\det(A-\\lambda I)=0$. الصفحة القصيرة [[المتجهات الذاتية]] تبقى المرجع حين أعود من درس تطبيقي.",
    ),
    h("التعريفات والقوانين"),
    math("\\det(A-\\lambda I)=0"),
    para("كل $\\lambda$ جذر لكثير الحدود هذا. ثم أحل $(A-\\lambda I)v=0$ مع $v \\neq 0$."),
    h("مثال"),
    para("للمصفوفة $\\begin{pmatrix}2&1\\\\1&2\\end{pmatrix}$ كثير الحدود $(2-\\lambda)^2-1=0$، إذن $\\lambda=3$ و $\\lambda=1$."),
    table(
      ["λ", "متجه ذاتي"],
      [
        ["3", "(1, 1)"],
        ["1", "(1, −1)"],
      ],
    ),
    h("أخطاء وقعت فيها"),
    note("mistake", "نسيت شرط $v \\neq 0$ فقبلت الحل الصفري كمتجه ذاتي."),
    h("أسئلة لاختبار الفهم"),
    tasks([["هل كل مصفوفة حقيقية مربعة لها قيم ذاتية حقيقية؟ الدوران بتسعين درجة مثال مضاد.", false]]),
    h("خلاصة المراجعة"),
    note("summary", "القيمة الذاتية اتجاه لا يدوره التحويل، والعدد مقدار تمدده. الوجود الحقيقي ليس مضموناً إلا في حالات مثل المصفوفات المتماثلة."),
  ];

  const eigenConcept: Block[] = [
    h("التعريف"),
    para("إذا ضربت المصفوفة $A$ المتجه $v$ فبقي على استقامته وتغير طوله فقط، فـ $v$ متجه ذاتي و $\\lambda$ قيمته الذاتية:"),
    math("Av = \\lambda v"),
    h("أين يظهر"),
    para(
      "مصفوفة التغاير متماثلة، فقيمها الذاتية حقيقية ومتجهاتها يمكن اختيارها متعامدة. لهذا تصلح محاور [[تحليل المكونات الرئيسية]]. الحساب المفصل في [[القيم والمتجهات الذاتية]].",
    ),
    h("مثال قصير"),
    para(
      "الانعكاس حول محور السينات مصفوفته $\\begin{pmatrix}1&0\\\\0&-1\\end{pmatrix}$. المتجه $(1,0)$ يبقى كما هو فقيمته 1، والمتجه $(0,1)$ ينقلب فقيمته −1.",
    ),
    h("خلاصة"),
    note("summary", "القيمة الذاتية مقدار التمدد، والمتجه الذاتي اتجاه لا يدوره التحويل."),
  ];

  const centerBlocks: Block[] = [
    h("الفكرة الأساسية"),
    para("قبل أي تغاير أجعل متوسط كل عمود صفراً. أكتبها في NumPy كطرح متجه المتوسط من كل صف، لا كحلقة على العناصر."),
    h("مثال"),
    code(`import numpy as np

X = np.array([[2.0, 8.0], [4.0, 10.0], [6.0, 12.0]])
centered = X - X.mean(axis=0)
assert np.allclose(centered.mean(axis=0), 0)
print(centered)`),
    para(
      "axis=0 يعني المتوسط على الصفوف، فيبقى متجه بطول عدد الأعمدة. هذا هو شكل البيانات الذي يدخل [[تحليل المكونات الرئيسية]]. الافتراضي في np.cov هو rowvar=True، أي أن كل صف متغير. عيناتي موضوعة في الصفوف، لذلك أمرر rowvar=False.",
    ),
    h("لم أفهم بعد"),
    note("unclear", "أفرّق بصرياً بين شكل (عينات × متغيرات) وشكله المنقول، لكنني ما زلت أتحقق من axis في كل مرة بدل أن أثبّت قاعدة واحدة."),
    h("أسئلة لاختبار الفهم"),
    tasks([["متى أقسم على n ومتى على n−1، وأيهما يغيّر المتجهات الذاتية لا مقدارها فقط؟", false]]),
    h("خلاصة المراجعة"),
    note("summary", "التوسيط طرح للمتوسط على axis=0. من غيره يختلط مركز السحابة باتجاه الانتشار."),
  ];

  return {
    version: 1,
    notebooks: [
      { id: "nb-ml", title: "تعلم الآلة", order: 0 },
      { id: "nb-math", title: "الرياضيات", order: 1 },
      { id: "nb-py", title: "Python", order: 2 },
    ],
    sections: [
      { id: "sec-dim", notebookId: "nb-ml", title: "تقليل الأبعاد", order: 0 },
      { id: "sec-lin", notebookId: "nb-math", title: "الجبر الخطي", order: 0 },
      { id: "sec-mat", notebookId: "nb-py", title: "المصفوفات", order: 0 },
    ],
    pages: [
      page({
        id: "page-pca",
        notebookId: "nb-ml",
        sectionId: "sec-dim",
        type: "lesson",
        title: "تحليل المكونات الرئيسية",
        status: "need-review",
        subject: "تعلم الآلة",
        source: "محاضرة تقليل الأبعاد",
        studiedAt: "2026-10-18",
        blocks: pcaBlocks,
      }),
      page({
        id: "page-var",
        notebookId: "nb-ml",
        sectionId: "sec-dim",
        type: "concept",
        title: "التباين",
        subject: "إحصاء",
        source: "مراجعة قبل PCA",
        blocks: varianceBlocks,
      }),
      page({
        id: "page-proj",
        notebookId: "nb-ml",
        sectionId: "sec-dim",
        type: "concept",
        title: "الإسقاط",
        subject: "جبر خطي",
        source: "تعريف هندسي مختصر",
        blocks: projBlocks,
      }),
      page({
        id: "page-eigen-lesson",
        notebookId: "nb-math",
        sectionId: "sec-lin",
        type: "lesson",
        title: "القيم والمتجهات الذاتية",
        status: "understood",
        subject: "الجبر الخطي",
        source: "محاضرة القيم الذاتية",
        studiedAt: "2026-10-12",
        blocks: eigenLesson,
      }),
      page({
        id: "page-eigen",
        notebookId: "nb-math",
        sectionId: "sec-lin",
        type: "concept",
        title: "المتجهات الذاتية",
        subject: "الجبر الخطي",
        source: "تعريف أرجع إليه من أكثر من درس",
        blocks: eigenConcept,
      }),
      page({
        id: "page-center",
        notebookId: "nb-py",
        sectionId: "sec-mat",
        type: "lesson",
        title: "توسيط البيانات",
        status: "started",
        subject: "Python",
        source: "تجربة NumPy",
        studiedAt: "2026-10-21",
        blocks: centerBlocks,
      }),
    ],
    links: [
      { id: "link-pca-var", fromPageId: "page-pca", toPageId: "page-var" },
      { id: "link-pca-eigen", fromPageId: "page-pca", toPageId: "page-eigen" },
      { id: "link-pca-proj", fromPageId: "page-pca", toPageId: "page-proj" },
      { id: "link-lesson-eigen", fromPageId: "page-eigen-lesson", toPageId: "page-eigen" },
      { id: "link-center-pca", fromPageId: "page-center", toPageId: "page-pca" },
    ],
    activePageId: "page-pca",
    view: "write",
  };
}
