import React from "react";
import { Navigate } from "react-router-dom";
import { tokenMasihValid } from "../lib/api";

const PrivateRoute = ({ children }) => {
  // Periksa masa berlaku token, bukan sekadar keberadaannya. Token yang
  // sudah kedaluwarsa tetap ada di localStorage, sehingga halaman sempat
  // terbuka lalu pengguna langsung ditendang oleh request pertama.
  if (!tokenMasihValid()) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
