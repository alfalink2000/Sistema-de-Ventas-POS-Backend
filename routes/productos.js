// routes/productos.js - SIN CAMBIOS (pero el controlador interno está actualizado)
import { Router } from "express";
import {
  obtenerProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  buscarProductos,
  actualizarStock,
} from "../controllers/productosController.js";
import { validarJWT } from "../middlewares/validar-jwt.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = Router();

// ✅ RUTAS CON FORMDATA Y MANEJO DE ERRORES
router.post("/", validarJWT, upload, crearProducto);
router.put("/:id", validarJWT, upload, actualizarProducto);

// RUTAS SIN FORMDATA
router.get("/", obtenerProductos);
router.get("/buscar", buscarProductos);
router.get("/:id", obtenerProductoPorId);
router.delete("/:id", validarJWT, eliminarProducto);
router.put("/:id/stock", validarJWT, actualizarStock);

export default router;
