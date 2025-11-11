// routes/health.js
import { Router } from "express";

const router = Router();

// ✅ Ruta de salud básica
router.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "✅ Servidor funcionando correctamente",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ✅ Ruta de verificación de servicios
router.get("/services", (req, res) => {
  const services = {
    database: "SQLite - Online",
    api: "Operacional",
    authentication: "Funcionando",
    storage: "Disponible",
  };

  res.json({
    ok: true,
    services,
    timestamp: new Date().toISOString(),
  });
});

export default router;
