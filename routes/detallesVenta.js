// routes/detallesVenta.js
import { Router } from "express";
import {
  obtenerDetallesPorVenta,
  crearDetallesVenta,
} from "../controllers/detallesVentaController.js";

const router = Router();

router.get("/venta/:ventaId", obtenerDetallesPorVenta);
router.post("/", crearDetallesVenta);

export default router;
