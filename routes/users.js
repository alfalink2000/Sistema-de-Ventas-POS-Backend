// routes/users.js
import { Router } from "express";
import {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} from "../controllers/usersController.js";
import { validarJWT } from "../middlewares/validar-jwt.js";

const router = Router();

// ✅ TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
router.get("/", validarJWT, obtenerUsuarios);
router.get("/:id", validarJWT, obtenerUsuarioPorId);
router.post("/", validarJWT, crearUsuario);
router.put("/:id", validarJWT, actualizarUsuario);
router.delete("/:id", validarJWT, eliminarUsuario);

export default router;
