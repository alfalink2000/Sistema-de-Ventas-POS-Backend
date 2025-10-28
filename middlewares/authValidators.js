import { check } from "express-validator";
import { db } from "../database/connection.js";
import { validarCampos } from "./validar-campos.js";

// Validación mejorada para login
export const validateLogin = [
  check("username")
    .notEmpty()
    .withMessage("El usuario es obligatorio")
    .isLength({ min: 3, max: 20 })
    .withMessage("El usuario debe tener entre 3 y 20 caracteres")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "El usuario solo puede contener letras, números y guiones bajos"
    )
    .custom(async (username) => {
      const user = await db.get(
        "SELECT id FROM users WHERE username = ? AND activo = true",
        [username]
      );
      if (!user) {
        throw new Error("Credenciales inválidas");
      }
      return true;
    }),

  check("password")
    .notEmpty()
    .withMessage("La contraseña es obligatoria")
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres"),

  validarCampos,
];

// Validación para crear usuario (más estricta)
export const validateCreateUser = [
  check("username")
    .notEmpty()
    .withMessage("El usuario es obligatorio")
    .isLength({ min: 3, max: 20 })
    .withMessage("El usuario debe tener entre 3 y 20 caracteres")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "El usuario solo puede contener letras, números y guiones bajos"
    )
    .custom(async (username) => {
      const user = await db.get("SELECT id FROM users WHERE username = ?", [
        username,
      ]);
      if (user) {
        throw new Error("El usuario ya existe");
      }
      return true;
    }),

  check("email")
    .isEmail()
    .withMessage("Debe ser un email válido")
    .normalizeEmail()
    .custom(async (email) => {
      const user = await db.get("SELECT id FROM users WHERE email = ?", [
        email,
      ]);
      if (user) {
        throw new Error("El email ya está registrado");
      }
      return true;
    }),

  check("password")
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "La contraseña debe contener al menos una mayúscula, una minúscula y un número"
    ),

  check("nombre")
    .notEmpty()
    .withMessage("El nombre es obligatorio")
    .isLength({ min: 2, max: 100 })
    .withMessage("El nombre debe tener entre 2 y 100 caracteres"),

  check("rol")
    .optional()
    .isIn(["admin", "vendedor", "cajero"])
    .withMessage("Rol no válido"),

  validarCampos,
];

// Validación para actualizar usuario
export const validateUpdateUser = [
  check("username")
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage("El usuario debe tener entre 3 y 20 caracteres")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "El usuario solo puede contener letras, números y guiones bajos"
    )
    .custom(async (username, { req }) => {
      const user = await db.get(
        "SELECT id FROM users WHERE username = ? AND id != ?",
        [username, req.params.id]
      );
      if (user) {
        throw new Error("El usuario ya existe");
      }
      return true;
    }),

  check("email")
    .optional()
    .isEmail()
    .withMessage("Debe ser un email válido")
    .normalizeEmail()
    .custom(async (email, { req }) => {
      const user = await db.get(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, req.params.id]
      );
      if (user) {
        throw new Error("El email ya está registrado");
      }
      return true;
    }),

  check("rol")
    .optional()
    .isIn(["admin", "vendedor", "cajero"])
    .withMessage("Rol no válido"),

  validarCampos,
];
