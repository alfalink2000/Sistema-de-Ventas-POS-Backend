// models/Categoria.js CORREGIDO
import { db } from "../database/connection.js";

export class Categoria {
  static async findAll(activo = true) {
    try {
      const sql = activo
        ? "SELECT * FROM categorias WHERE activo = ? ORDER BY nombre"
        : "SELECT * FROM categorias ORDER BY nombre";
      const result = await db.query(sql, [activo]);
      return result.rows || []; // ✅ Acceder a .rows
    } catch (error) {
      console.error("Error en Categoria.findAll:", error);
      return [];
    }
  }

  static async findById(id) {
    try {
      const sql = "SELECT * FROM categorias WHERE id = ?";
      const result = await db.query(sql, [id]); // ✅ Agregar await
      return result.rows[0] || null; // ✅ Acceder a .rows[0]
    } catch (error) {
      console.error("Error en Categoria.findById:", error);
      return null;
    }
  }

  static async create(categoriaData) {
    try {
      const { nombre, descripcion = "", activo = true } = categoriaData;
      const sql = `
        INSERT INTO categorias (id, nombre, descripcion, activo) 
        VALUES (?, ?, ?, ?)
      `;

      const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = await db.query(sql, [id, nombre, descripcion, activo]);

      return id; // ✅ Retornar el ID generado
    } catch (error) {
      console.error("Error en Categoria.create:", error);
      throw error;
    }
  }

  static async update(id, updates) {
    try {
      const fields = [];
      const values = [];

      Object.keys(updates).forEach((key) => {
        if (["nombre", "descripcion", "activo"].includes(key)) {
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });

      if (fields.length === 0) return null;

      values.push(id);
      const sql = `UPDATE categorias SET ${fields.join(
        ", "
      )}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const result = await db.query(sql, values);

      return result; // ✅ Retornar resultado completo
    } catch (error) {
      console.error("Error en Categoria.update:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Verificar si hay productos usando esta categoría
      const productosResult = await db.query(
        "SELECT id FROM productos WHERE categoria_id = ? LIMIT 1",
        [id]
      );

      if (productosResult.rows.length > 0) {
        throw new Error(
          "No se puede eliminar la categoría porque tiene productos asociados"
        );
      }

      const sql = "DELETE FROM categorias WHERE id = ?";
      const result = await db.query(sql, [id]);
      return result;
    } catch (error) {
      console.error("Error en Categoria.delete:", error);
      throw error;
    }
  }
}
