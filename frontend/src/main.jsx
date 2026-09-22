import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { terapkanModeAwal } from "./hooks/useMode";

// Pasang mode sebelum React render agar tidak ada kedipan warna
terapkanModeAwal();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
