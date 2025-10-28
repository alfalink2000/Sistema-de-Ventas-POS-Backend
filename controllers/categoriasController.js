// controllers/categoriasController.js
import { Categoria } from "../models/Categoria.js";

export const obtenerCategorias = async (req, res) => {
  try {
    console.log("📥 [BACKEND] GET /api/categorias recibida");
    const { activo = "true" } = req.query;
    const categorias = await Categoria.findAll(activo === "true");

    console.log(`📤 [BACKEND] Enviando ${categorias.length} categorías`);
    res.json({
      ok: true,
      categorias,
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error en obtenerCategorias:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener categorías",
    });
  }
};

export const obtenerCategoriaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const categoria = await Categoria.findById(id);

    if (!categoria) {
      return res.status(404).json({
        ok: false,
        error: "Categoría no encontrada",
      });
    }

    res.json({
      ok: true,
      categoria,
    });
  } catch (error) {
    console.error("Error al obtener categoría:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener la categoría",
    });
  }
};

export const crearCategoria = async (req, res) => {
  try {
    const { nombre, descripcion, activo } = req.body;

    if (!nombre) {
      return res.status(400).json({
        ok: false,
        error: "El nombre de la categoría es requerido",
      });
    }

    const id = await Categoria.create({
      nombre,
      descripcion: descripcion || "",
      activo: activo !== undefined ? activo : true,
    });

    res.status(201).json({
      ok: true,
      message: "Categoría creada exitosamente",
      id,
    });
  } catch (error) {
    console.error("Error al crear categoría:", error);

    // Manejar error de duplicado
    if (error.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({
        ok: false,
        error: "Ya existe una categoría con ese nombre",
      });
    }

    res.status(500).json({
      ok: false,
      error: "Error interno al crear categoría",
    });
  }
};

export const actualizarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validar que hay campos para actualizar
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        ok: false,
        error: "No se proporcionaron campos para actualizar",
      });
    }

    const result = await Categoria.update(id, updates);

    if (!result) {
      return res.status(404).json({
        ok: false,
        error: "Categoría no encontrada",
      });
    }

    res.json({
      ok: true,
      message: "Categoría actualizada exitosamente",
    });
  } catch (error) {
    console.error("Error al actualizar categoría:", error);

    if (error.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({
        ok: false,
        error: "Ya existe una categoría con ese nombre",
      });
    }

    res.status(500).json({
      ok: false,
      error: "Error interno al actualizar categoría",
    });
  }
};

export const eliminarCategoria = async (req, res) => {
  try {
    const { id } = req.params;

    await Categoria.delete(id);

    res.json({
      ok: true,
      message: "Categoría eliminada exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar categoría:", error);

    if (error.message.includes("productos asociados")) {
      return res.status(400).json({
        ok: false,
        error: error.message,
      });
    }

    res.status(500).json({
      ok: false,
      error: "Error interno al eliminar categoría",
    });
  }
};
