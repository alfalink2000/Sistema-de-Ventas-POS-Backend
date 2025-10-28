// routes/sesionesCaja.js
import express from "express";
import {
  obtenerSesionAbierta,
  abrirSesion,
  cerrarSesion,
  obtenerSesionesVendedor,
  obtenerSesionPorId,
} from "../controllers/sesionesCajaController.js";

const router = express.Router();

router.get("/abierta", obtenerSesionAbierta);
router.post("/abrir", abrirSesion);
router.put("/cerrar/:sesionId", cerrarSesion);
router.get("/vendedor/:vendedor_id", obtenerSesionesVendedor);
router.get("/:id", obtenerSesionPorId);

export default router;
