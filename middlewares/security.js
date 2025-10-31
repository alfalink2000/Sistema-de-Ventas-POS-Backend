// middlewares/security.js - CONFIGURACIÓN CORS CORREGIDA
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

// ✅ CONFIGURACIÓN CORS CORREGIDA - PRIORIDAD A LOCALHOST EN DESARROLLO
const corsOptions = {
  origin: function (origin, callback) {
    // En desarrollo, permitir localhost siempre
    if (process.env.NODE_ENV === "development") {
      console.log("🔧 Desarrollo - Permitido:", origin);
      return callback(null, true);
    }

    // Permitir requests sin origin (mobile apps, curl, etc.)
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

    // ✅ CORRECCIÓN: Verificar si el origen está en la lista
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

// ✅ MIDDLEWARE CORS MANUAL MEJORADO
const manualCORS = (req, res, next) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://sistema-de-ventas-pos-frontend.vercel.app",
  ];

  const origin = req.headers.origin;

  // ✅ CORRECCIÓN: En desarrollo, permitir cualquier localhost
  if (
    process.env.NODE_ENV === "development" &&
    origin &&
    origin.includes("localhost")
  ) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  // En producción, solo el dominio específico
  else if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  // Si no hay origin o no está permitido, no establecer el header
  else if (!origin) {
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

  // Manejar preflight OPTIONS request
  if (req.method === "OPTIONS") {
    console.log("🔄 Preflight OPTIONS request manejado");
    return res.status(200).end();
  }

  next();
};
// Rate limiting para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    ok: false,
    msg: "Demasiados intentos de login. Intenta nuevamente en 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting general
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    ok: false,
    msg: "Demasiadas solicitudes desde esta IP.",
  },
});

// Rate limiting para escritura
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    ok: false,
    msg: "Demasiadas operaciones de escritura.",
  },
});

// Middlewares de seguridad
const securityMiddleware = [
  manualCORS, // ✅ CORS MANUAL PRIMERO
  cors(corsOptions), // ✅ CORS de cors package
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
