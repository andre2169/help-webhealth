import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";

const standaloneMedia = window.matchMedia("(display-mode: standalone)");
const isStandalone = standaloneMedia.matches || window.navigator.standalone === true;
document.documentElement.classList.toggle("is-standalone", isStandalone);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // A aplicação continua funcionando normalmente sem o cache do PWA.
    });
  });
}

