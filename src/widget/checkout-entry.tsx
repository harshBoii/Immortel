import { createRoot } from "react-dom/client";
import Checkout from "./Checkout";

const container =
  document.getElementById("root") ??
  document.body.appendChild(document.createElement("div"));

createRoot(container).render(<Checkout />);

// ✅ Required — signal ChatGPT the widget is ready
// window.parent.postMessage(
//   {
//     jsonrpc: "2.0",
//     method: "ui/notifications/ready",
//     params: {},
//   },
//   "*"
// );
