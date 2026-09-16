import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import "./index.css";

// HashRouter, not BrowserRouter: the app is served from a local file:// origin
// inside the Tauri webview, where a history-API router can't resolve real
// server routes on refresh.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
