import { createRoot } from "react-dom/client";
import { App } from "@modelcontextprotocol/ext-apps";
import ProductList from "./ProductList";

const app = new App(
  { name: "Immortel Product List", version: "1.0.0" },
  {},
  { autoResize: true }
);

const container =
  document.getElementById("root") ??
  document.body.appendChild(document.createElement("div"));

// Pass initial data setter to component via callback
let setDataCallback: ((data: any) => void) | null = null;

// Set BEFORE connect()
app.ontoolresult = (result: any) => {
  const data =
    result.structuredContent ??
    JSON.parse(result.content?.find((c: any) => c.type === "text")?.text ?? "null");
  if (data && setDataCallback) setDataCallback(data);
};

app.connect(); // ← critical

createRoot(container).render(
  <ProductList app={app} onReady={(fn) => { setDataCallback = fn; }} />
);
