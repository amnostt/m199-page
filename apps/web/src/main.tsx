import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./public.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error(
    "Root element not found. Make sure index.html includes <div id='root'></div>.",
  );
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
