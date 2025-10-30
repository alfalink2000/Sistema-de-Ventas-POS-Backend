// routes/health.js - VERSIÓN COMPLETA CON TURSO
import express from "express";
import { db } from "../database/connection.js";

const router = express.Router();

// Health check mejorado con Turso
router.get("/health", async (req, res) => {
  const startTime = Date.now();

  try {
    let dbStatus = "unknown";
    let dbResponseTime = 0;
    let dbInfo = null;

    // Verificar base de datos Turso
    try {
      const dbStartTime = Date.now();

      // Test real de la base de datos Turso
      const testResult = await db.query(
        "SELECT datetime() as server_time, 1 as test_value"
      );
      dbStatus = "connected";
      dbResponseTime = Date.now() - dbStartTime;

      // Obtener información adicional de la BD
      dbInfo = await db.getDatabaseInfo();
    } catch (dbError) {
      dbStatus = "disconnected";
      dbResponseTime = Date.now() - startTime;
      console.log("❌ Health check - Error BD Turso:", dbError.message);
    }

    const totalTime = Date.now() - startTime;

    res.json({
      ok: true,
      status: dbStatus === "connected" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      responseTime: totalTime,
      services: {
        database: {
          status: dbStatus,
          responseTime: dbResponseTime,
          type: "Turso SQLite",
          tables: dbInfo?.tables || [],
          totalTables: dbInfo?.total_tables || 0,
        },
        api: {
          status: "running",
          version: "1.0.0",
        },
      },
      environment: process.env.NODE_ENV || "development",
      cors: {
        allowedOrigins: [
          "http://localhost:5173",
          "http://localhost:3000",
          "https://sistema-de-ventas-pos-frontend.vercel.app",
        ],
        credentials: true,
      },
      limits: {
        maxFileSize: "10mb",
        rateLimit: "1000 requests per 15 minutes",
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime: Date.now() - startTime,
    });
  }
});

// Health check simple para monitoreo
router.head("/health", (req, res) => {
  res.set("X-API-Status", "healthy");
  res.set("X-API-Version", "1.0.0");
  res.status(200).end();
});

// Health check extendido con más verificaciones
router.get("/health/extended", async (req, res) => {
  const healthReport = {
    ok: true,
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    // Verificación de base de datos Turso
    healthReport.checks.database = await checkTursoDatabaseHealth();

    // Verificación de memoria
    healthReport.checks.memory = {
      used: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
      rss: process.memoryUsage().rss,
      usagePercent:
        (
          (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) *
          100
        ).toFixed(2) + "%",
    };

    // Uptime y performance
    healthReport.checks.system = {
      uptime: process.uptime(),
      uptimeFormatted: formatUptime(process.uptime()),
      platform: process.platform,
      architecture: process.arch,
    };

    // Versiones
    healthReport.checks.versions = {
      node: process.version,
      v8: process.versions.v8,
      uv: process.versions.uv,
    };

    // Determinar estado general
    healthReport.status =
      healthReport.checks.database.status === "connected"
        ? "healthy"
        : "degraded";

    // Estadísticas de rendimiento
    healthReport.performance = {
      responseTime: Date.now() - new Date(healthReport.timestamp).getTime(),
      environment: process.env.NODE_ENV || "development",
    };
  } catch (error) {
    healthReport.ok = false;
    healthReport.status = "unhealthy";
    healthReport.error = error.message;
  }

  res.json(healthReport);
});

// Health check mínimo para load balancers
router.get("/health/minimal", async (req, res) => {
  try {
    // Verificación rápida de la base de datos
    await db.query("SELECT 1 as status");

    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "SERVICE_UNAVAILABLE",
      timestamp: new Date().toISOString(),
      error: "Database unavailable",
    });
  }
});

// Función para verificar salud de Turso
async function checkTursoDatabaseHealth() {
  try {
    const startTime = Date.now();

    // Test de conexión básico
    const testResult = await db.query(
      "SELECT datetime() as server_time, 1 as test_value"
    );
    const responseTime = Date.now() - startTime;

    // Obtener información de tablas
    const dbInfo = await db.getDatabaseInfo();

    // Verificar tablas críticas
    const criticalTables = ["users", "productos", "ventas", "categorias"];
    const missingTables = criticalTables.filter(
      (table) => !dbInfo.tables.includes(table)
    );

    return {
      status: "connected",
      responseTime: responseTime + "ms",
      serverTime: testResult.rows[0].server_time,
      tables: {
        total: dbInfo.total_tables,
        list: dbInfo.tables,
        missingCritical: missingTables,
      },
      connection: {
        type: "Turso SQLite",
        url: process.env.TURSO_DB_URL ? "✅ Configurado" : "❌ No configurado",
        token: process.env.TURSO_AUTH_TOKEN ? "✅ Presente" : "❌ Faltante",
      },
    };
  } catch (error) {
    return {
      status: "disconnected",
      error: error.message,
      connection: {
        type: "Turso SQLite",
        url: process.env.TURSO_DB_URL ? "✅ Configurado" : "❌ No configurado",
        token: process.env.TURSO_AUTH_TOKEN ? "✅ Presente" : "❌ Faltante",
      },
    };
  }
}

// Función para formatear uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(" ") || "0s";
}

export default router;
