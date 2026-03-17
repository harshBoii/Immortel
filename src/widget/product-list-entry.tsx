import { createRoot } from "react-dom/client";
import ProductList from "./ProductList";

const container =
  document.getElementById("root") ??
  document.body.appendChild(document.createElement("div"));

createRoot(container).render(<ProductList />);

// ✅ Required — tell ChatGPT the widget is ready to receive tool results
window.parent.postMessage(
  {
    jsonrpc: "2.0",
    method: "ui/notifications/ready",
    params: {},
  },
  "*"
);
