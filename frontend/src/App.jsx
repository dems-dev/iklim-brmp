import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Shell from "./components/Shell";
import PrivateRoute from "./components/PrivateRoute";
import Beranda from "./pages/Beranda";
import Masuk from "./pages/Masuk";
import Dasbor from "./pages/Dasbor";
import EksplorasiData from "./pages/EksplorasiData";
import MutuData from "./pages/MutuData";
import Unggah from "./pages/Unggah";
import { tokenMasihValid, userSaatIni } from "./lib/api";
import { useMode } from "./hooks/useMode";
import { EmptyState, Button } from "./components/ui";

/** Halaman yang hanya boleh dibuka admin. */
function AdminRoute({ children }) {
  const user = userSaatIni();
  if (user?.role !== "admin") {
    return (
      <EmptyState
        icon="⚿"
        title="Akses terbatas"
        action={
          <Button as="a" href="/dasbor" variant="primary" size="sm">
            Kembali ke dasbor
          </Button>
        }
      >
        Halaman unggah hanya untuk akun dengan peran admin. Hubungi pengelola
        sistem bila Anda memerlukan akses ini.
      </EmptyState>
    );
  }
  return children;
}

export default function App() {
  // Cek masa berlaku token, bukan sekadar keberadaannya
  const [isLoggedIn, setIsLoggedIn] = useState(tokenMasihValid);

  // Pasang atribut data-mode di elemen akar sedini mungkin
  useMode();

  const halaman = (isi) => (
    <PrivateRoute>
      <Shell setIsLoggedIn={setIsLoggedIn}>{isi}</Shell>
    </PrivateRoute>
  );

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to="/dasbor" replace />
            ) : (
              <Masuk setIsLoggedIn={setIsLoggedIn} />
            )
          }
        />
        <Route
          path="/register"
          element={
            isLoggedIn ? <Navigate to="/dasbor" replace /> : <Masuk mendaftar />
          }
        />

        <Route path="/dasbor" element={halaman(<Dasbor />)} />
        <Route path="/data" element={halaman(<EksplorasiData />)} />
        <Route path="/mutu" element={halaman(<MutuData />)} />
        <Route
          path="/unggah"
          element={halaman(
            <AdminRoute>
              <Unggah />
            </AdminRoute>
          )}
        />

        {/* Beranda publik, bisa dibuka tanpa login */}
        <Route path="/" element={<Beranda />} />
        <Route
          path="*"
          element={<Navigate to={isLoggedIn ? "/dasbor" : "/"} replace />}
        />
      </Routes>
    </Router>
  );
}
