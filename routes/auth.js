import { Router } from "express";
import {
  login,
  renovarToken /*, crearUsuario */,
} from "../controllers/authController.js";
import { validarJWT } from "../middlewares/validar-jwt.js";
// import { validateLogin, validateCreateUser } from '../middlewares/validators/authValidators.js';

const router = Router();

// POST /api/auth/login
router.post("/login", /* validateLogin, */ login);

// POST /api/auth/register
// router.post('/register', /* validateCreateUser, */ crearUsuario);

// GET /api/auth/renew
router.get("/renew", validarJWT, renovarToken);

export default router;
