import { createRoot } from "react-dom/client";
import { App } from "@modelcontextprotocol/ext-apps";
import Checkout from "./Checkout";


const app = new App({ name: "Immortel Checkout", version: "1.0.0" });

const container =
  document.getElementById("root") ??
  document.body.appendChild(document.createElement("div"));

let setDataFn: ((d: any) => void) | null = null;

app.ontoolresult = (result) => {
  const textContent = result.content?.find(
    (c): c is Extract<typeof c, { type: "text" }> => c.type === "text"
  );
  if (textContent && setDataFn) {
    try { setDataFn(JSON.parse(textContent.text)); } catch {}
  }
};

app.connect(); // ← after ontoolresult


createRoot(container).render(
  <Checkout onReady={(fn) => { setDataFn = fn; }} app={app} />
);
