import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { pesanError } from "../lib/api";
import { Button, Field, Input } from "../components/ui";
import { useMode } from "../hooks/useMode";

// Akun demo untuk pengunjung portofolio. Diisi saat build lewat env, jadi
// kotak demo hanya muncul di deployment yang memang menyetelnya. Password ini
// sengaja publik: akunnya ber-role user sehingga hanya bisa membaca.
const DEMO = {
  username: import.meta.env.VITE_DEMO_USERNAME,
  password: import.meta.env.VITE_DEMO_PASSWORD,
};
const adaDemo = Boolean(DEMO.username && DEMO.password);

/** Satu komponen untuk masuk dan daftar, tata letaknya identik. */
export default function Masuk({ mendaftar = false, setIsLoggedIn }) {
  const [form, setForm] = useState({ username: "", email: "", password: "", konfirmasi: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { mode, toggle } = useMode();

  const ubah = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const masuk = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setIsLoggedIn?.(true);
    navigate("/dasbor");
  };

  const masukDemo = async () => {
    setError("");
    setLoading(true);
    try {
      await masuk(DEMO.username, DEMO.password);
    } catch (err) {
      setError(pesanError(err, "Akun demo sedang tidak dapat dipakai"));
    } finally {
      setLoading(false);
    }
  };

  const kirim = async (e) => {
    e.preventDefault();
    setError("");

    if (mendaftar) {
      if (form.password !== form.konfirmasi) return setError("Konfirmasi password tidak cocok");
      if (form.password.length < 8) return setError("Password minimal 8 karakter");
    }

    setLoading(true);
    try {
      if (mendaftar) {
        await api.post("/auth/register", {
          username: form.username,
          email: form.email,
          password: form.password,
        });
        navigate("/login", { state: { baru: true } });
      } else {
        await masuk(form.username, form.password);
      }
    } catch (err) {
      setError(pesanError(err, mendaftar ? "Registrasi gagal" : "Username atau password salah"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <header className="flex items-center gap-3 px-5 py-3.5">
        <img
          src="/logo-kementan.png"
          alt="Logo Kementerian Pertanian Republik Indonesia"
          className="w-7 h-7 object-contain shrink-0"
        />
        <span className="font-bold text-[13.5px] tracking-[0.01em]">AGROKLIMAT</span>
        <button
          type="button"
          onClick={toggle}
          aria-label={mode === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
          className="ml-auto w-[29px] h-[29px] rounded-[7px] border border-rule-2 grid place-items-center
                     text-ink-2 text-[13px] hover:text-ink hover:border-ink-3 transition-colors"
        >
          {mode === "dark" ? "◐" : "◑"}
        </button>
      </header>

      <div className="flex-1 grid place-items-center px-5 py-8">
        <div className="w-full max-w-[380px]">
          <h1 className="font-display text-[26px] font-bold tracking-[-0.028em] m-0 mb-1.5">
            {mendaftar ? "Buat akun" : "Masuk"}
          </h1>
          <p className="text-[13px] text-ink-2 m-0 mb-6">
            Platform Informasi Iklim &middot; BRMP Agroklimat
          </p>

          {adaDemo && !mendaftar && (
            <div className="border border-rule-2 bg-panel rounded-lg px-3.5 py-3 mb-5">
              <p className="label-caps m-0 mb-1.5">Akun demo</p>
              <p className="text-[12.5px] text-ink-2 m-0 mb-2.5 leading-relaxed">
                Username <code className="font-mono text-ink">{DEMO.username}</code>
                {" · "}password <code className="font-mono text-ink">{DEMO.password}</code>.
                Akses baca saja. Data yang ditampilkan adalah data sintetis.
              </p>
              <Button
                type="button"
                onClick={masukDemo}
                disabled={loading}
                size="sm"
                className="w-full justify-center"
              >
                Masuk sebagai demo
              </Button>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="bg-crit-bg border border-crit/30 rounded-lg px-3.5 py-2.5 mb-4
                         text-[12.5px] text-crit"
            >
              {error}
            </div>
          )}

          <form onSubmit={kirim} className="flex flex-col gap-3.5">
            <Field label="Username">
              <Input
                value={form.username}
                onChange={ubah("username")}
                autoComplete="username"
                placeholder="Masukkan username"
                className="w-full"
              />
            </Field>

            {mendaftar && (
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={ubah("email")}
                  autoComplete="email"
                  placeholder="nama@instansi.go.id"
                  className="w-full"
                />
              </Field>
            )}

            <Field label="Password">
              <Input
                type="password"
                value={form.password}
                onChange={ubah("password")}
                autoComplete={mendaftar ? "new-password" : "current-password"}
                placeholder={mendaftar ? "Minimal 8 karakter" : "Masukkan password"}
                className="w-full"
              />
            </Field>

            {mendaftar && (
              <Field label="Konfirmasi password">
                <Input
                  type="password"
                  value={form.konfirmasi}
                  onChange={ubah("konfirmasi")}
                  autoComplete="new-password"
                  placeholder="Ulangi password"
                  className="w-full"
                />
              </Field>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="justify-center py-2.5 mt-1"
            >
              {loading ? "Memproses…" : mendaftar ? "Daftar" : "Masuk"}
            </Button>
          </form>

          <p className="text-[12.5px] text-ink-2 text-center mt-5 m-0">
            {mendaftar ? "Sudah punya akun? " : "Belum punya akun? "}
            <Link
              to={mendaftar ? "/login" : "/register"}
              className="text-accent font-semibold hover:underline"
            >
              {mendaftar ? "Masuk" : "Daftar"}
            </Link>
          </p>

          {mendaftar && (
            <p className="text-[11.5px] text-ink-3 text-center mt-3 m-0 leading-relaxed">
              Pendaftaran mandiri menghasilkan akses baca. Hak unggah diberikan
              oleh admin.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
