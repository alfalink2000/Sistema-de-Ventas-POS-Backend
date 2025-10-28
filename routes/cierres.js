// routes/cierresCaja.js - VERSIÓN ACTUALIZADA
import { Router } from "express";
import {
  crearCierreCaja,
  obtenerCierres,
  obtenerCierrePorId,
  obtenerCierreDelDia,
  calcularTotalesCierre,
  obtenerEstadisticasCierres,
  actualizarCierre,
  eliminarCierre,
} from "../controllers/cierresController.js";

const router = Router();

// Rutas principales
router.post("/", crearCierreCaja);
router.get("/", obtenerCierres);
router.get("/estadisticas", obtenerEstadisticasCierres);
router.get("/hoy", obtenerCierreDelDia);
router.get("/calcular-totales/:sesion_caja_id", calcularTotalesCierre);

// Rutas por ID
router.get("/:id", obtenerCierrePorId);
router.put("/:id", actualizarCierre);
router.delete("/:id", eliminarCierre);

export default router;
