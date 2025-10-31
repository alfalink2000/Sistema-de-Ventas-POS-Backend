// models/Inventario.js - CORREGIDO PARA TURSO/SQLITE
import { db } from "../database/connection.js";

export class Inventario {
  // ✅ CREAR REGISTRO DE INVENTARIO
  static async create(inventarioData) {
    try {
      const {
        producto_id,
        stock_actual = 0,
        stock_minimo = 5,
      } = inventarioData;

      const sql = `
        INSERT INTO inventario 
        (id, producto_id, stock_actual, stock_minimo, ultima_actualizacion) 
        VALUES (?, ?, ?, ?, ?)
      `;

      const id = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const result = await db.query(sql, [
        id,
        producto_id,
        stock_actual,
        stock_minimo,
        new Date().toISOString(),
      ]);

      return id;
    } catch (error) {
      console.error("Error en Inventario.create:", error);
      throw error;
    }
  }

  // ✅ ENCONTRAR POR PRODUCTO_ID
  static async findByProductoId(producto_id) {
    try {
      const sql = `
        SELECT * FROM inventario 
        WHERE producto_id = ? 
        ORDER BY ultima_actualizacion DESC 
        LIMIT 1
      `;
      const result = await db.query(sql, [producto_id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error en Inventario.findByProductoId:", error);
      return null;
    }
  }

  // ✅ ACTUALIZAR INVENTARIO
  static async update(producto_id, updates) {
    try {
      const fields = [];
      const values = [];

      const allowedFields = ["stock_actual", "stock_minimo"];

      Object.keys(updates).forEach((key) => {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });

      if (fields.length === 0) return null;

      // Siempre actualizar la fecha
      fields.push("ultima_actualizacion = ?");
      values.push(new Date().toISOString());

      values.push(producto_id);

      const sql = `
        UPDATE inventario 
        SET ${fields.join(", ")} 
        WHERE producto_id = ?
      `;

      const result = await db.query(sql, values);
      return result;
    } catch (error) {
      console.error("Error en Inventario.update:", error);
      throw error;
    }
  }

  // ✅ CREAR O ACTUALIZAR (UPSERT)
  static async createOrUpdate(producto_id, inventarioData) {
    try {
      const existing = await this.findByProductoId(producto_id);

      if (existing) {
        return await this.update(producto_id, inventarioData);
      } else {
        return await this.create({
          producto_id,
          ...inventarioData,
        });
      }
    } catch (error) {
      console.error("Error en Inventario.createOrUpdate:", error);
      throw error;
    }
  }

  // ✅ OBTENER TODOS LOS INVENTARIOS
  static async findAll(filters = {}) {
    try {
      let sql = `
        SELECT i.*, p.nombre as producto_nombre, p.codigo_barras
        FROM inventario i
        LEFT JOIN productos p ON i.producto_id = p.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.stock_bajo !== undefined) {
        sql += " AND i.stock_actual <= i.stock_minimo";
      }

      if (filters.producto_activo !== undefined) {
        sql += " AND p.activo = ?";
        params.push(filters.producto_activo);
      }

      sql += " ORDER BY i.ultima_actualizacion DESC";

      const result = await db.query(sql, params);
      return result.rows || [];
    } catch (error) {
      console.error("Error en Inventario.findAll:", error);
      return [];
    }
  }

  // ✅ OBTENER PRODUCTOS CON STOCK BAJO
  static async findStockBajo() {
    try {
      const sql = `
        SELECT i.*, p.nombre as producto_nombre, p.imagen_url, p.precio
        FROM inventario i
        LEFT JOIN productos p ON i.producto_id = p.id
        WHERE i.stock_actual <= i.stock_minimo 
        AND p.activo = true
        ORDER BY i.stock_actual ASC
      `;

      const result = await db.query(sql);
      return result.rows || [];
    } catch (error) {
      console.error("Error en Inventario.findStockBajo:", error);
      return [];
    }
  }

  // ✅ ELIMINAR INVENTARIO (POR PRODUCTO)
  static async deleteByProductoId(producto_id) {
    try {
      const sql = "DELETE FROM inventario WHERE producto_id = ?";
      const result = await db.query(sql, [producto_id]);
      return result;
    } catch (error) {
      console.error("Error en Inventario.deleteByProductoId:", error);
      throw error;
    }
  }

  // ✅ OBTENER ESTADÍSTICAS DE INVENTARIO
  static async getEstadisticas() {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_productos,
          SUM(stock_actual) as stock_total,
          AVG(stock_actual) as stock_promedio,
          COUNT(CASE WHEN stock_actual <= stock_minimo THEN 1 END) as productos_stock_bajo,
          COUNT(CASE WHEN stock_actual = 0 THEN 1 END) as productos_sin_stock
        FROM inventario i
        LEFT JOIN productos p ON i.producto_id = p.id
        WHERE p.activo = true
      `;

      const result = await db.query(sql);
      return result.rows[0] || {};
    } catch (error) {
      console.error("Error en Inventario.getEstadisticas:", error);
      return {};
    }
  }
}

export default Inventario;
