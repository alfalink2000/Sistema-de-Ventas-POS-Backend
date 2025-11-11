// middlewares/security.js - VERSIÓN CON RATE LIMITING DESACTIVADO EN DESARROLLO

import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

const isDevelopment = process.env.NODE_ENV === "development";

// ✅ MIDDLEWARE SIN LIMITES (para desarrollo)
const noRateLimit = (req, res, next) => {
  console.log("🔓 Rate limiting desactivado en desarrollo");
  next();
};

// ✅ RATE LIMITING SOLO PARA PRODUCCIÓN
const loginLimiter = isDevelopment
  ? noRateLimit
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 50, // 50 intentos en producción
      message: {
        ok: false,
        msg: "Demasiados intentos de login. Intenta nuevamente en 15 minutos.",
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

// ✅ RATE LIMITING MUY PERMISIVO PARA DESARROLLO
const apiLimiter = isDevelopment
  ? rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minuto
      max: 1000, // 1000 requests por minuto en desarrollo
      message: {
        ok: false,
        msg: "Demasiadas solicitudes en desarrollo.",
      },
    })
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500, // 500 requests en producción
      message: {
        ok: false,
        msg: "Demasiadas solicitudes desde esta IP.",
      },
    });

// ✅ RATE LIMITING PARA ESCRITURA - PERMISIVO
const writeLimiter = isDevelopment
  ? rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 500, // 500 operaciones por minuto en desarrollo
      message: {
        ok: false,
        msg: "Demasiadas operaciones de escritura en desarrollo.",
      },
    })
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100, // 100 operaciones en producción
      message: {
        ok: false,
        msg: "Demasiadas operaciones de escritura.",
      },
    });

// ✅ CONFIGURACIÓN CORS (mantener igual)
const corsOptions = {
  origin: function (origin, callback) {
    if (process.env.NODE_ENV === "development") {
      console.log("🔧 Desarrollo - Permitido:", origin);
      return callback(null, true);
    }

    if (!origin) {
      console.log("📱 Request sin origin - Permitido");
      return callback(null, true);
    }

    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
      "https://localhost:5173",
      "https://localhost:3000",
      "https://sistema-de-ventas-pos-frontend.vercel.app",
    ];

    if (allowedOrigins.includes(origin)) {
      console.log("✅ Origen permitido:", origin);
      callback(null, true);
    } else {
      console.log("❌ Origen bloqueado:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
    "x-token",
  ],
};

// ✅ MIDDLEWARE CORS MANUAL (mantener igual)
const manualCORS = (req, res, next) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://sistema-de-ventas-pos-frontend.vercel.app",
  ];

  const origin = req.headers.origin;

  if (
    process.env.NODE_ENV === "development" &&
    origin &&
    origin.includes("localhost")
  ) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    res.header("Access-Control-Allow-Origin", "*");
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, x-token"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Expose-Headers", "x-token");

  if (req.method === "OPTIONS") {
    console.log("🔄 Preflight OPTIONS request manejado");
    return res.status(200).end();
  }

  next();
};

// Middlewares de seguridad
const securityMiddleware = [
  manualCORS,
  cors(corsOptions),
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
];

export {
  securityMiddleware,
  loginLimiter,
  apiLimiter,
  writeLimiter,
  corsOptions,
  manualCORS,
};
