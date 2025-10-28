import { Router } from "express";
import {
  obtenerInventario,
  actualizarStock,
  obtenerProductosBajoStock,
  sincronizarInventario,
} from "../controllers/inventarioController.js";

const router = Router();

router.get("/", obtenerInventario);
router.get("/bajo-stock", obtenerProductosBajoStock);
router.put("/stock/:productoId", actualizarStock);
router.post("/sincronizar", sincronizarInventario);

export default router;
