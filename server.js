import express from "express";
import dotenv from "dotenv";
import {
  securityMiddleware,
  apiLimiter,
  loginLimiter,
  writeLimiter,
} from "./middlewares/security.js";
import ventasRoutes from "./routes/ventas.js";
import productosRoutes from "./routes/productos.js";
import inventarioRoutes from "./routes/inventario.js";
import cierresRoutes from "./routes/cierres.js";
import authRoutes from "./routes/auth.js";
import { db } from "./database/connection.js";
import categoriasRoutes from "./routes/categorias.js";
import sesionesCajaRoutes from "./routes/sesionesCaja.js";
import detallesVentaRoutes from "./routes/detallesVenta.js";
import usersRoutes from "./routes/users.js";

import diagnosticRoutes from "./routes/diagnostic.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(securityMiddleware);
app.use(apiLimiter);
app.use(express.json({ limit: "10mb" }));

// Logger solo para desarrollo
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Rutas API
app.use("/api/auth", loginLimiter, authRoutes);
app.use("/api/ventas", writeLimiter, ventasRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/cierres", writeLimiter, cierresRoutes);
app.use("/api/sesiones-caja", sesionesCajaRoutes);
app.use("/api/detalles-venta", detallesVentaRoutes);
app.use("/api/users", usersRoutes);

app.use("/api/diagnostic", diagnosticRoutes);
// Health check
app.get("/api/health", async (req, res) => {
  const dbConnected = db.isConnected();
  res.json({
    status: "OK",
    database: dbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Manejo de errores
app.use("*", (req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.use((error, req, res, next) => {
  console.error(error.message);
  res.status(500).json({ error: "Error interno del servidor" });
});

// Iniciar servidor
const startServer = async () => {
  try {
    await db.init();
    app.listen(PORT, () => {
      console.log(`✅ Servidor en puerto ${PORT}`);
      console.log(`🌍 Modo: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar:", error.message);
    process.exit(1);
  }
};

startServer();
