// server.js - VERSIÓN CON LOGS MEJORADOS
import express from "express";
import dotenv from "dotenv";
import {
  securityMiddleware,
  apiLimiter,
  loginLimiter,
  writeLimiter,
  manualCORS,
} from "./middlewares/security.js";
import ventasRoutes from "./routes/ventas.js";
import productosRoutes from "./routes/productos.js";
import cierresRoutes from "./routes/cierres.js";
import authRoutes from "./routes/auth.js";
import { db } from "./database/connection.js";
import categoriasRoutes from "./routes/categorias.js";
import sesionesCajaRoutes from "./routes/sesionesCaja.js";
import detallesVentaRoutes from "./routes/detallesVenta.js";
import usersRoutes from "./routes/users.js";
import healthRoutes from "./routes/health.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// 🎨 SISTEMA DE LOGS MEJORADO
// =============================================

const Logger = {
  colors: {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
  },

  getTimestamp() {
    return new Date().toLocaleString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  },

  // 🔵 LOGS DE INFORMACIÓN
  info(message, context = "") {
    const timestamp = this.getTimestamp();
    console.log(
      `${this.colors.blue}📘 [${timestamp}] ${this.colors.reset}${message}${
        context ? ` ${this.colors.dim}(${context})${this.colors.reset}` : ""
      }`
    );
  },

  // ✅ LOGS DE ÉXITO
  success(message, context = "") {
    const timestamp = this.getTimestamp();
    console.log(
      `${this.colors.green}✅ [${timestamp}] ${this.colors.reset}${message}${
        context ? ` ${this.colors.dim}(${context})${this.colors.reset}` : ""
      }`
    );
  },

  // ⚠️ LOGS DE ADVERTENCIA
  warn(message, context = "") {
    const timestamp = this.getTimestamp();
    console.log(
      `${this.colors.yellow}⚠️ [${timestamp}] ${this.colors.reset}${message}${
        context ? ` ${this.colors.dim}(${context})${this.colors.reset}` : ""
      }`
    );
  },

  // ❌ LOGS DE ERROR
  error(message, context = "") {
    const timestamp = this.getTimestamp();
    console.log(
      `${this.colors.red}❌ [${timestamp}] ${this.colors.reset}${message}${
        context ? ` ${this.colors.dim}(${context})${this.colors.reset}` : ""
      }`
    );
  },

  // 🔄 LOGS DE PROCESOS
  process(message, context = "") {
    const timestamp = this.getTimestamp();
    console.log(
      `${this.colors.cyan}🔄 [${timestamp}] ${this.colors.reset}${message}${
        context ? ` ${this.colors.dim}(${context})${this.colors.reset}` : ""
      }`
    );
  },

  // 🌐 LOGS DE RED/SERVIDOR
  network(message, context = "") {
    const timestamp = this.getTimestamp();
    console.log(
      `${this.colors.magenta}🌐 [${timestamp}] ${this.colors.reset}${message}${
        context ? ` ${this.colors.dim}(${context})${this.colors.reset}` : ""
      }`
    );
  },

  // 📊 LOGS DE DATOS/BD
  data(message, context = "") {
    const timestamp = this.getTimestamp();
    console.log(
      `${this.colors.cyan}📊 [${timestamp}] ${this.colors.reset}${message}${
        context ? ` ${this.colors.dim}(${context})${this.colors.reset}` : ""
      }`
    );
  },

  // 🗂️ LOGS DE RUTAS
  route(method, path, status = "") {
    const timestamp = this.getTimestamp();
    const methodColor =
      {
        GET: this.colors.green,
        POST: this.colors.blue,
        PUT: this.colors.yellow,
        DELETE: this.colors.red,
        PATCH: this.colors.magenta,
      }[method] || this.colors.white;

    console.log(
      `${methodColor}${method} ${this.colors.reset}📡 [${timestamp}] ${path}${
        status ? ` ${this.colors.dim}→ ${status}${this.colors.reset}` : ""
      }`
    );
  },

  // 🎯 BANNER DE INICIO
  banner() {
    console.log(
      `\n${this.colors.cyan}╔══════════════════════════════════════════════════════════════╗`
    );
    console.log(
      `║                   🚀 KIOSKO POS BACKEND API                   ║`
    );
    console.log(
      `║                    Sistema de Gestión Comercial               ║`
    );
    console.log(
      `╚══════════════════════════════════════════════════════════════╝${this.colors.reset}\n`
    );
  },

  // 📋 TABLA DE RUTAS
  printRouteTable(routes) {
    console.log(`\n${this.colors.cyan}📋 TABLA DE RUTAS DISPONIBLES:`);
    console.log(
      `${this.colors.cyan}┌─────────────────────────────────┬──────────────────────────┐`
    );
    console.log(
      `│ ${this.colors.green}RUTA${this.colors.cyan}                         │ ${this.colors.green}DESCRIPCIÓN${this.colors.cyan}             │`
    );
    console.log(
      `├─────────────────────────────────┼──────────────────────────┤`
    );

    routes.forEach((route) => {
      const path = route.path.padEnd(30);
      const description = route.description.padEnd(24);
      console.log(
        `│ ${this.colors.blue}${path}${this.colors.cyan} │ ${this.colors.white}${description}${this.colors.cyan} │`
      );
    });

    console.log(
      `└─────────────────────────────────┴──────────────────────────┘${this.colors.reset}\n`
    );
  },

  // 🏥 TABLA DE HEALTH CHECKS
  printHealthEndpoints(port) {
    console.log(`\n${this.colors.green}🏥 ENDPOINTS DE MONITOREO Y SALUD:`);
    console.log(
      `${this.colors.green}┌───────────────────────────────────────────────────┬────────────────────┐`
    );
    console.log(
      `│ ${this.colors.cyan}ENDPOINT${this.colors.green}                                         │ ${this.colors.cyan}TIPO${this.colors.green}            │`
    );
    console.log(
      `├───────────────────────────────────────────────────┼────────────────────┤`
    );
    console.log(
      `│ ${this.colors.blue}http://localhost:${port}/api/health${this.colors.green}                 │ ${this.colors.white}Completo${this.colors.green}        │`
    );
    console.log(
      `│ ${this.colors.blue}http://localhost:${port}/api/health/extended${this.colors.green}        │ ${this.colors.white}Extendido${this.colors.green}       │`
    );
    console.log(
      `│ ${this.colors.blue}http://localhost:${port}/api/health/minimal${this.colors.green}         │ ${this.colors.white}Mínimo${this.colors.green}          │`
    );
    console.log(
      `└───────────────────────────────────────────────────┴────────────────────┘${this.colors.reset}\n`
    );
  },
};

// =============================================
// 🛡️ CONFIGURACIÓN DE SEGURIDAD Y MIDDLEWARES
// =============================================

// CORS manual primero
app.use(manualCORS);

// Middlewares de seguridad
app.use(securityMiddleware);
app.use(apiLimiter);
app.use(express.json({ limit: "10mb" }));

// =============================================
// 📊 MIDDLEWARE DE LOGS DE PETICIONES MEJORADO
// =============================================

app.use((req, res, next) => {
  const timestamp = Logger.getTimestamp();
  const hasToken = !!req.headers["x-token"];
  const origin = req.headers.origin || "Directo";
  const userAgent = req.headers["user-agent"]?.split(" ")[0] || "Unknown";

  Logger.network(`Solicitud recibida: ${req.method} ${req.originalUrl}`);
  Logger.data(
    `Origen: ${origin} | Cliente: ${userAgent} | Token: ${
      hasToken ? "✅ Presente" : "❌ Ausente"
    }`
  );

  // Capturar el tiempo de respuesta
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusIcon =
      status >= 200 && status < 300
        ? "✅"
        : status >= 400 && status < 500
        ? "⚠️"
        : "❌";

    Logger.network(
      `Respuesta enviada: ${statusIcon} ${status} - ${req.method} ${req.originalUrl} (${duration}ms)`
    );
  });

  next();
});

// =============================================
// 🎯 RUTA RAIZ INFORMATIVA
// =============================================

app.get("/", (req, res) => {
  Logger.route("GET", "/", "200 OK");
  res.json({
    ok: true,
    msg: "Bienvenido a Kiosko POS Backend API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    status: "🟢 Online",
    environment: process.env.NODE_ENV || "development",
    documentation: {
      health: "GET /api/health",
      extended: "GET /api/health/extended",
      minimal: "GET /api/health/minimal",
      status_codes: {
        200: "OK - Solicitud exitosa",
        400: "Bad Request - Datos inválidos",
        401: "Unauthorized - No autenticado",
        403: "Forbidden - Sin permisos",
        404: "Not Found - Recurso no existe",
        500: "Internal Server Error - Error del servidor",
      },
    },
  });
});

// =============================================
// 🗂️ REGISTRO DE RUTAS API
// =============================================

Logger.process("CARGANDO RUTAS API...");

const routes = [
  { path: "/api/health", route: healthRoutes, description: "Health Checks" },
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
    description: "Gestión de Ventas",
  },
  {
    path: "/api/productos",
    route: productosRoutes,
    description: "Gestión de Productos",
  },
  {
    path: "/api/categorias",
    route: categoriasRoutes,
    description: "Categorías",
  },
  {
    path: "/api/cierres",
    route: cierresRoutes,
    limiter: writeLimiter,
    description: "Cierres de Caja",
  },
  {
    path: "/api/sesiones-caja",
    route: sesionesCajaRoutes,
    description: "Sesiones de Caja",
  },
  {
    path: "/api/detalles-venta",
    route: detallesVentaRoutes,
    description: "Detalles de Ventas",
  },
  {
    path: "/api/users",
    route: usersRoutes,
    description: "Gestión de Usuarios",
  },
];

// Registrar rutas
routes.forEach(({ path, route, limiter, description }) => {
  if (limiter) {
    app.use(path, limiter, route);
  } else {
    app.use(path, route);
  }
  Logger.success(`Ruta registrada: ${path}`, description);
});

Logger.success(
  `Todas las rutas cargadas correctamente (${routes.length} rutas)`
);

// =============================================
// 🚨 MANEJO DE ERRORES MEJORADO
// =============================================

// Manejo de rutas no encontradas
app.use("*", (req, res) => {
  Logger.error(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    ok: false,
    error: "🔍 Ruta no encontrada",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    available_routes: routes.map((r) => ({
      path: r.path,
      description: r.description,
      methods: ["GET", "POST", "PUT", "DELETE"], // Asumiendo que todas soportan estos métodos
    })),
  });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  Logger.error(`Error en ${req.method} ${req.path}:`, error.message);

  if (error.message.includes("CORS")) {
    Logger.warn(`Intento de acceso CORS denegado desde: ${req.headers.origin}`);
    return res.status(403).json({
      ok: false,
      error: "🚫 Acceso denegado por política CORS",
      origin: req.headers.origin,
      allowed_origins: [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://sistema-de-ventas-pos-frontend.vercel.app",
      ],
      timestamp: new Date().toISOString(),
    });
  }

  res.status(500).json({
    ok: false,
    error: "💥 Error interno del servidor",
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === "development" && {
      details: error.message,
      stack: error.stack,
    }),
  });
});

// =============================================
// 🚀 INICIO DEL SERVIDOR
// =============================================

const startServer = async () => {
  try {
    Logger.banner();

    Logger.process("INICIANDO SERVIDOR KIOSKO POS...");
    Logger.info(`Entorno: ${process.env.NODE_ENV || "development"}`);
    Logger.info(`Puerto: ${PORT}`);

    // Inicializar base de datos
    Logger.process("Conectando con la base de datos...");
    await db.init();
    Logger.success("Base de datos conectada exitosamente");

    // Iniciar servidor
    app.listen(PORT, () => {
      Logger.success(`Servidor iniciado exitosamente en puerto ${PORT}`);

      // Mostrar información del sistema
      console.log(`\n${Logger.colors.green}🎯 INFORMACIÓN DEL SISTEMA:`);
      console.log(
        `${Logger.colors.green}├─ ${Logger.colors.cyan}URL Local:${Logger.colors.white}    http://localhost:${PORT}`
      );
      console.log(
        `${Logger.colors.green}├─ ${Logger.colors.cyan}Entorno:${
          Logger.colors.white
        }     ${process.env.NODE_ENV || "development"}`
      );
      console.log(
        `${Logger.colors.green}├─ ${Logger.colors.cyan}Versión Node:${Logger.colors.white} ${process.version}`
      );
      console.log(
        `${Logger.colors.green}├─ ${Logger.colors.cyan}Plataforma:${Logger.colors.white}   ${process.platform}`
      );
      console.log(
        `${Logger.colors.green}└─ ${Logger.colors.cyan}Directorio:${
          Logger.colors.white
        }   ${process.cwd()}${Logger.colors.reset}`
      );

      // Mostrar endpoints de health
      Logger.printHealthEndpoints(PORT);

      // Mostrar tabla de rutas
      Logger.printRouteTable(routes);

      // Información de CORS
      console.log(`\n${Logger.colors.magenta}🌐 CONFIGURACIÓN CORS:`);
      console.log(
        `${Logger.colors.magenta}├─ ${Logger.colors.green}✅ Desarrollo:${Logger.colors.white} Todos los orígenes permitidos`
      );
      console.log(
        `${Logger.colors.magenta}├─ ${Logger.colors.green}✅ Producción:${Logger.colors.white} Dominios específicos`
      );
      console.log(
        `${Logger.colors.magenta}└─ ${Logger.colors.blue}🔗 Frontend:${Logger.colors.white}  https://sistema-de-ventas-pos-frontend.vercel.app${Logger.colors.reset}`
      );

      // Mensaje final
      console.log(
        `\n${Logger.colors.green}✨ El servidor está listo y escuchando solicitudes...`
      );
      console.log(
        `${Logger.colors.dim}   Presiona Ctrl+C para detener el servidor${Logger.colors.reset}\n`
      );
    });
  } catch (error) {
    Logger.error(`ERROR CRÍTICO INICIANDO SERVIDOR: ${error.message}`);
    console.log(`\n${Logger.colors.red}💥 NO SE PUDO INICIAR EL SERVIDOR`);
    console.log(`${Logger.colors.red}📋 Detalles del error:`);
    console.log(`${Logger.colors.red}├─ Mensaje: ${error.message}`);
    console.log(`${Logger.colors.red}├─ Stack: ${error.stack}`);
    console.log(
      `${Logger.colors.red}└─ Código: ${error.code || "N/A"}${
        Logger.colors.reset
      }\n`
    );
    process.exit(1);
  }
};

// Manejo elegante de cierre
process.on("SIGINT", () => {
  Logger.warn("\nRecibida señal de interrupción (SIGINT)");
  Logger.process("Cerrando servidor gracefuly...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  Logger.warn("Recibida señal de terminación (SIGTERM)");
  Logger.process("Cerrando servidor...");
  process.exit(0);
});

// Iniciar la aplicación
startServer();
