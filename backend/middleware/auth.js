const jwt = require("jsonwebtoken");

// Verifikasi token JWT
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token tidak ditemukan" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    const expired = err.name === "TokenExpiredError";
    res.status(401).json({
      error: expired ? "Sesi telah berakhir, silakan login kembali" : "Token tidak valid",
      code: expired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
    });
  }
};

// Batasi akses ke role tertentu. Pakai SETELAH auth.
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      error: "Akses ditolak. Aksi ini hanya untuk: " + roles.join(", "),
    });
  }
  next();
};

module.exports = auth;
module.exports.auth = auth;
module.exports.requireRole = requireRole;
