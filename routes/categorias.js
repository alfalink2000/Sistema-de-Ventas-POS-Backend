import { Router } from "express";
import {
  obtenerCategorias,
  obtenerCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
} from "../controllers/categoriasController.js";

const router = Router();

router.get("/", obtenerCategorias);
router.get("/:id", obtenerCategoriaPorId);
router.post("/", crearCategoria);
router.put("/:id", actualizarCategoria);
router.delete("/:id", eliminarCategoria);

export default router;
