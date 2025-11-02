// routes/inventario.js - VERSIÓN ACTUALIZADA
import { Router } from "express";
import {
  obtenerInventario,
  actualizarStock,
  obtenerProductosBajoStock,
  sincronizarInventario,
  sincronizarProductosConInventario,
  verificarInconsistencias,
} from "../controllers/inventarioController.js";

const router = Router();

router.get("/", obtenerInventario);
router.get("/bajo-stock", obtenerProductosBajoStock);
router.put("/stock/:productoId", actualizarStock);
router.post("/sincronizar", sincronizarInventario);
router.post("/sincronizar-productos", sincronizarProductosConInventario);
router.get("/verificar-inconsistencias", verificarInconsistencias);

export default router;
