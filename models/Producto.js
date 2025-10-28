// models/Producto.js CORREGIDO
import { db } from "../database/connection.js";

export class Producto {
  static async findAll(filters = {}) {
    try {
      let sql = `
        SELECT p.*, c.nombre as categoria_nombre 
        FROM productos p 
        LEFT JOIN categorias c ON p.categoria_id = c.id 
        WHERE 1=1
      `;
      const params = [];

      if (filters.activo !== undefined) {
        sql += " AND p.activo = ?";
        params.push(filters.activo);
      }

      if (filters.categoria_id) {
        sql += " AND p.categoria_id = ?";
        params.push(filters.categoria_id);
      }

      sql += " ORDER BY p.nombre";

      const result = await db.query(sql, params);
      return result.rows || []; // ✅ Acceder a .rows
    } catch (error) {
      console.error("Error en Producto.findAll:", error);
      return [];
    }
  }

  static async findById(id) {
    try {
      const sql = `
        SELECT p.*, c.nombre as categoria_nombre 
        FROM productos p 
        LEFT JOIN categorias c ON p.categoria_id = c.id 
        WHERE p.id = ?
      `;
      const result = await db.query(sql, [id]); // ✅ Agregar await
      return result.rows[0] || null; // ✅ Acceder a .rows[0]
    } catch (error) {
      console.error("Error en Producto.findById:", error);
      return null;
    }
  }

  static async create(productoData) {
    try {
      const {
        nombre,
        descripcion = "",
        precio,
        precio_compra,
        categoria_id,
        stock = 0,
        stock_minimo = 5,
        codigo_barras = null,
        imagen_url = null,
        activo = true,
      } = productoData;

      const sql = `
        INSERT INTO productos 
        (id, nombre, descripcion, precio, precio_compra, categoria_id, stock, stock_minimo, codigo_barras, imagen_url, activo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const id = `prod_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const result = await db.query(sql, [
        id,
        nombre,
        descripcion,
        precio,
        precio_compra,
        categoria_id,
        stock,
        stock_minimo,
        codigo_barras,
        imagen_url,
        activo,
      ]);

      return id; // ✅ Retornar ID generado
    } catch (error) {
      console.error("Error en Producto.create:", error);
      throw error;
    }
  }

  static async update(id, updates) {
    try {
      const fields = [];
      const values = [];

      const allowedFields = [
        "nombre",
        "descripcion",
        "precio",
        "precio_compra",
        "categoria_id",
        "stock",
        "stock_minimo",
        "codigo_barras",
        "imagen_url",
        "activo",
      ];

      Object.keys(updates).forEach((key) => {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });

      if (fields.length === 0) return null;

      values.push(id);
      const sql = `UPDATE productos SET ${fields.join(
        ", "
      )}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const result = await db.query(sql, values);

      return result; // ✅ Retornar resultado completo
    } catch (error) {
      console.error("Error en Producto.update:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const sql = "UPDATE productos SET activo = false WHERE id = ?";
      const result = await db.query(sql, [id]);
      return result;
    } catch (error) {
      console.error("Error en Producto.delete:", error);
      throw error;
    }
  }

  static async buscar(termino, categoria_id = null) {
    try {
      let sql = `
        SELECT p.*, c.nombre as categoria_nombre 
        FROM productos p 
        LEFT JOIN categorias c ON p.categoria_id = c.id 
        WHERE p.activo = true AND (
          p.nombre LIKE ? OR p.descripcion LIKE ? OR p.codigo_barras = ?
        )
      `;
      const params = [`%${termino}%`, `%${termino}%`, termino];

      if (categoria_id) {
        sql += " AND p.categoria_id = ?";
        params.push(categoria_id);
      }

      sql += " ORDER BY p.nombre";

      const result = await db.query(sql, params);
      return result.rows || []; // ✅ Acceder a .rows
    } catch (error) {
      console.error("Error en Producto.buscar:", error);
      return [];
    }
  }

  // ✅ NUEVO: Actualizar stock
  static async actualizarStock(id, nuevoStock) {
    try {
      const sql =
        "UPDATE productos SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
      const result = await db.query(sql, [nuevoStock, id]);
      return result;
    } catch (error) {
      console.error("Error en Producto.actualizarStock:", error);
      throw error;
    }
  }
}
