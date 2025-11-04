import { Router } from "express";
import {
  login,
  renovarToken /*, crearUsuario */,
} from "../controllers/authController.js";
import { validarJWT } from "../middlewares/validar-jwt.js";
// import { validateLogin, validateCreateUser } from '../middlewares/validators/authValidators.js';

const router = Router();

router.post("/login", /* validateLogin, */ login);

router.get("/renew", validarJWT, renovarToken);

router.get("/verify-token", validarJWT, (req, res) => {
  try {
    const { uid, name } = req;

    console.log("✅ Token verificado para usuario:", uid);

    res.json({
      ok: true,
      message: "Token válido",
      usuario: {
        id: uid,
        nombre: name,
        // Puedes agregar más datos si los necesitas
      },
    });
  } catch (error) {
    console.error("❌ Error en verify-token:", error);
    res.status(500).json({
      ok: false,
      error: "Error verificando token",
    });
  }
});

export default router;
