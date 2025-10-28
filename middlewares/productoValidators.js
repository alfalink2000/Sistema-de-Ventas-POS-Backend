import { check } from "express-validator";
import { validarCampos } from "../validar-campos.js";

export const validateCreateProducto = [
  check("nombre")
    .notEmpty()
    .withMessage("El nombre del producto es obligatorio")
    .isLength({ min: 2, max: 100 })
    .withMessage("El nombre debe tener entre 2 y 100 caracteres"),

  check("precio")
    .isFloat({ min: 0 })
    .withMessage("El precio debe ser un número positivo")
    .notEmpty()
    .withMessage("El precio es obligatorio"),

  check("precio_compra")
    .isFloat({ min: 0 })
    .withMessage("El precio de compra debe ser un número positivo")
    .notEmpty()
    .withMessage("El precio de compra es obligatorio"),

  check("categoria_id").notEmpty().withMessage("La categoría es obligatoria"),

  check("stock")
    .isInt({ min: 0 })
    .withMessage("El stock debe ser un número entero positivo")
    .optional(),

  check("stock_minimo")
    .isInt({ min: 0 })
    .withMessage("El stock mínimo debe ser un número entero positivo")
    .optional(),

  validarCampos,
];

export const validateUpdateProducto = [
  check("nombre")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("El nombre debe tener entre 2 y 100 caracteres"),

  check("precio")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("El precio debe ser un número positivo"),

  check("precio_compra")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("El precio de compra debe ser un número positivo"),

  check("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("El stock debe ser un número entero positivo"),

  validarCampos,
];
