import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

// ✅ Configuración CORS MEJORADA
const corsOptions = {
  origin: function (origin, callback) {
    // En desarrollo, permitir todos los orígenes para debug
    if (process.env.NODE_ENV === "development") {
      return callback(null, true);
    }

    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
      "https://localhost:5173",
      "https://localhost:3000",
      // Agrega aquí tus dominios de producción
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("❌ CORS bloqueado para origen:", origin);
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

// ✅ Middleware CORS manual como respaldo
const manualCORS = (req, res, next) => {
  const allowedOrigins =
    process.env.NODE_ENV === "development" ? "*" : "http://localhost:5173";

  res.header("Access-Control-Allow-Origin", allowedOrigins);
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

// Rate limiting para creación de productos/ventas
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    ok: false,
    msg: "Demasiadas operaciones de escritura. Intenta más tarde.",
  },
});

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
