import { createRoot } from "react-dom/client";
import Checkout from "./Checkout";

const container =
  document.getElementById("root") ??
  document.body.appendChild(document.createElement("div"));

createRoot(container).render(<Checkout />);

