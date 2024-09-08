import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root")!); // Create root
root.render(
  // Use createRoot to render
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
