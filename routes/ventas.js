// routes/ventas.js - VERSIÓN COMPLETA CORREGIDA
import express from "express";
import {
  crearVenta,
  obtenerVentas,
  obtenerVentaPorId,
  obtenerVentasPorSesion,
  obtenerVentasPorFecha, // ✅ AHORA ESTÁ EXPORTADO
  obtenerEstadisticasVentas,
  cancelarVenta,
  sincronizarVentasOffline,
} from "../controllers/ventasController.js";

const router = express.Router();

// Rutas principales de ventas
router.post("/", crearVenta);
router.get("/", obtenerVentas);
router.get("/estadisticas", obtenerEstadisticasVentas);
router.get("/:id", obtenerVentaPorId);
router.put("/:id/cancelar", cancelarVenta);

// Rutas específicas
router.get("/sesion/:sesionId", obtenerVentasPorSesion);
router.get("/fecha/:fecha", obtenerVentasPorFecha); // ✅ AHORA FUNCIONARÁ

// Ruta para sincronización offline
router.post("/sincronizar", sincronizarVentasOffline);

export default router;
