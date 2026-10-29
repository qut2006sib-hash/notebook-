import { createRoot } from "react-dom/client";
import { NotebookApp } from "./components/notebook/shell";
import "./styles.css";

try { if (localStorage.getItem("midad-theme") === "ink") document.documentElement.dataset.theme = "ink"; } catch { /* optional preference */ }
createRoot(document.getElementById("root")!).render(<NotebookApp />);
