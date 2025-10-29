// server.js - CON CORS COMPLETO
import express from "express";
import dotenv from "dotenv";
import {
  securityMiddleware,
  apiLimiter,
  loginLimiter,
  writeLimiter,
  manualCORS, // ✅ IMPORTAR manualCORS
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

// ✅ CORS MANUAL PRIMERO (igual a tu proyecto antiguo)
app.use(manualCORS);

// Middlewares de seguridad (incluye CORS automático)
app.use(securityMiddleware);
app.use(apiLimiter);
app.use(express.json({ limit: "10mb" }));

// ✅ LOGS MEJORADOS CON INFO CORS
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  const hasToken = !!req.headers["x-token"];
  const origin = req.headers.origin || "no-origin";

  console.log(`🌐 ${timestamp} - ${req.method} ${req.originalUrl}`);
  console.log(`📍 Origen: ${origin}`);
  console.log(`🔑 Token: ${hasToken ? "✅" : "❌"}`);

  next();
});

// ✅ HEALTH CHECK MEJORADO
app.get("/api/health", async (req, res) => {
  let dbStatus = "unknown";
  try {
    dbStatus = db.isConnected() ? "connected" : "disconnected";
  } catch (error) {
    dbStatus = "error";
    console.log("❌ Health check - Error BD:", error.message);
  }

  res.json({
    ok: true,
    msg: "Servidor Kiosko POS funcionando",
    database: dbStatus,
    environment: process.env.NODE_ENV || "development",
    cors: {
      allowedOrigins: [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://sistema-de-ventas-pos-frontend.vercel.app",
      ],
      credentials: true,
    },
    timestamp: new Date().toISOString(),
  });
});

// ✅ MÉTODO HEAD PARA MONITOREO
app.head("/api/health", (req, res) => {
  res.status(200).end();
});

// ✅ RUTA RAIZ INFORMATIVA
app.get("/", (req, res) => {
  res.json({
    ok: true,
    msg: "Bienvenido a Kiosko POS Backend API",
    timestamp: new Date().toISOString(),
    status: "online",
    cors: "Configurado para desarrollo y producción",
    documentation: "Consulta /api/health para estado del servidor",
  });
});

// ✅ RUTAS API
console.log("🔄 CARGANDO RUTAS API...");

const routes = [
  {
    path: "/api/auth",
    route: authRoutes,
    limiter: loginLimiter,
    description: "Autenticación",
  },
  {
    path: "/api/ventas",
    route: ventasRoutes,
    limiter: writeLimiter,
    description: "Ventas",
  },
  { path: "/api/productos", route: productosRoutes, description: "Productos" },
  {
    path: "/api/categorias",
    route: categoriasRoutes,
    description: "Categorías",
  },
  {
    path: "/api/inventario",
    route: inventarioRoutes,
    description: "Inventario",
  },
  {
    path: "/api/cierres",
    route: cierresRoutes,
    limiter: writeLimiter,
    description: "Cierres",
  },
  {
    path: "/api/sesiones-caja",
    route: sesionesCajaRoutes,
    description: "Sesiones caja",
  },
  {
    path: "/api/detalles-venta",
    route: detallesVentaRoutes,
    description: "Detalles venta",
  },
  { path: "/api/users", route: usersRoutes, description: "Usuarios" },
  {
    path: "/api/diagnostic",
    route: diagnosticRoutes,
    description: "Diagnóstico",
  },
];

routes.forEach(({ path, route, limiter, description }) => {
  if (limiter) {
    app.use(path, limiter, route);
  } else {
    app.use(path, route);
  }
  console.log(`✅ ${path} - ${description}`);
});

console.log("✅ TODAS LAS RUTAS CARGADAS\n");

// ✅ MANEJO DE ERRORES MEJORADO
app.use("*", (req, res) => {
  console.log(`❌ 404 - Ruta no encontrada: ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    ok: false,
    error: "Ruta no encontrada",
    path: req.originalUrl,
    method: req.method,
    availableRoutes: routes.map((r) => ({
      path: r.path,
      description: r.description,
    })),
  });
});

app.use((error, req, res, next) => {
  console.error(`💥 Error en ${req.method} ${req.path}:`, error.message);

  // Si es error CORS, dar mensaje específico
  if (error.message.includes("CORS")) {
    return res.status(403).json({
      ok: false,
      error: "Acceso denegado por política CORS",
      origin: req.headers.origin,
      allowedOrigins: [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://sistema-de-ventas-pos-frontend.vercel.app",
      ],
    });
  }

  res.status(500).json({
    ok: false,
    error: "Error interno del servidor",
    ...(process.env.NODE_ENV === "development" && {
      details: error.message,
    }),
  });
});

// ✅ INICIAR SERVIDOR
const startServer = async () => {
  try {
    console.log("🚀 INICIANDO SERVIDOR KIOSKO POS...");
    console.log("🌍 Environment:", process.env.NODE_ENV || "development");
    console.log("🔗 Puerto:", PORT);

    await db.init();
    console.log("🗄️  Base de datos: ✅ Conectada");

    app.listen(PORT, () => {
      console.log(`\n🎉 SERVIDOR INICIADO EXITOSAMENTE`);
      console.log(`📍 Puerto: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 URL Local: http://localhost:${PORT}`);
      console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);

      console.log(`\n🌐 CONFIGURACIÓN CORS:`);
      console.log(`   ✅ Desarrollo: Todos los orígenes permitidos`);
      console.log(`   ✅ Producción: Dominios específicos`);
      console.log(
        `   🔗 Frontend: https://sistema-de-ventas-pos-frontend.vercel.app`
      );

      console.log(`\n📋 RUTAS DISPONIBLES:`);
      routes.forEach((route) => {
        console.log(`   ${route.path} - ${route.description}`);
      });
    });
  } catch (error) {
    console.error("❌ ERROR CRÍTICO INICIANDO SERVIDOR:", error.message);
    process.exit(1);
  }
};

startServer();
