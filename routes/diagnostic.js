// routes/diagnostic.js
import { Router } from "express";
import { db } from "../database/connection.js";

const router = Router();
// routes/diagnostic.js - AGREGAR ESTE ENDPOINT
router.get("/check-cierres", async (req, res) => {
  try {
    // Verificar tablas
    const tablesCheck = await db.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name IN ('cierres_caja', 'sesiones_caja', 'users')
    `);

    // Verificar datos en cierres_caja
    let cierresCount = 0;
    try {
      const countResult = await db.execute(
        "SELECT COUNT(*) as count FROM cierres_caja"
      );
      cierresCount = countResult[0]?.count || 0;
    } catch (error) {
      cierresCount = "ERROR: " + error.message;
    }

    res.json({
      ok: true,
      tablas_existentes: tablesCheck.map((t) => t.name),
      cierres_count: cierresCount,
      mensaje: "Diagnóstico completado",
    });
  } catch (error) {
    res.json({
      ok: false,
      error: error.message,
    });
  }
});
// routes/diagnostic.js - Agregar este endpoint
router.post("/agregar-columna-sesion", async (req, res) => {
  try {
    console.log("🔧 Agregando columna sesion_caja_id a tabla ventas...");

    // Agregar la columna sesion_caja_id a la tabla ventas
    const alterQuery = `
      ALTER TABLE ventas ADD COLUMN sesion_caja_id TEXT
    `;

    await db.execute(alterQuery);

    console.log("✅ Columna sesion_caja_id agregada a tabla ventas");

    res.json({
      ok: true,
      message: "Columna sesion_caja_id agregada exitosamente a la tabla ventas",
    });
  } catch (error) {
    console.error("❌ Error agregando columna:", error);
    res.status(500).json({
      ok: false,
      error: "Error al agregar columna",
      details: error.message,
    });
  }
});

// Endpoint para diagnosticar estructura de tablas
router.get("/estructura-tablas", async (req, res) => {
  try {
    console.log("🔍 Diagnóstico de estructura de tablas...");

    // Verificar estructura de ventas
    const ventasStructure = await db.execute(`
      PRAGMA table_info(ventas)
    `);

    // Verificar estructura de sesiones_caja
    const sesionesStructure = await db.execute(`
      PRAGMA table_info(sesiones_caja)
    `);

    // Verificar estructura de cierres_caja
    const cierresStructure = await db.execute(`
      PRAGMA table_info(cierres_caja)
    `);

    // Verificar estructura de detalles_venta
    const detallesStructure = await db.execute(`
      PRAGMA table_info(detalles_venta)
    `);

    console.log("📊 Estructura de tabla 'ventas':", ventasStructure);
    console.log("📊 Estructura de tabla 'sesiones_caja':", sesionesStructure);
    console.log("📊 Estructura de tabla 'cierres_caja':", cierresStructure);
    console.log("📊 Estructura de tabla 'detalles_venta':", detallesStructure);

    res.json({
      ok: true,
      ventas: ventasStructure,
      sesiones_caja: sesionesStructure,
      cierres_caja: cierresStructure,
      detalles_venta: detallesStructure,
    });
  } catch (error) {
    console.error("❌ Error en diagnóstico:", error);
    res.status(500).json({
      ok: false,
      error: "Error en diagnóstico",
    });
  }
});

export default router;
