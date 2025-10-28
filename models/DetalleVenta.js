// models/DetalleVenta.js - VERSIÓN COMPLETA CORREGIDA
import { db } from "../database/connection.js";

export class DetalleVenta {
  // Crear lote de detalles de venta
  static async createBatch(detallesData) {
    try {
      console.log("🔄 [DETALLEVENTA] Creando batch de detalles:", detallesData);

      // ✅ VALIDAR QUE TODOS LOS DATOS REQUERIDOS ESTÉN PRESENTES
      for (const detalle of detallesData) {
        if (!detalle.venta_id) {
          throw new Error("venta_id es requerido");
        }
        if (!detalle.producto_id) {
          throw new Error("producto_id es requerido");
        }
        if (!detalle.cantidad || detalle.cantidad <= 0) {
          throw new Error("cantidad debe ser mayor a 0");
        }
        if (!detalle.precio_unitario || detalle.precio_unitario <= 0) {
          throw new Error("precio_unitario debe ser mayor a 0");
        }
      }

      const query = `
        INSERT INTO detalles_venta (
          id, venta_id, producto_id, cantidad, precio_unitario, subtotal, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `;

      const resultados = [];

      for (const detalle of detallesData) {
        const id = `det_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        console.log(`🔍 [DETALLEVENTA] Insertando detalle:`, {
          id,
          venta_id: detalle.venta_id,
          producto_id: detalle.producto_id,
          cantidad: detalle.cantidad,
          precio_unitario: detalle.precio_unitario,
          subtotal: detalle.subtotal,
        });

        const subtotal =
          detalle.subtotal || detalle.cantidad * detalle.precio_unitario;

        const result = await db.execute(query, [
          id,
          detalle.venta_id,
          detalle.producto_id.toString(),
          parseInt(detalle.cantidad),
          parseFloat(detalle.precio_unitario),
          parseFloat(subtotal),
        ]);

        resultados.push({ id, success: true });
      }

      console.log("✅ [DETALLEVENTA] Batch creado exitosamente");
      return resultados;
    } catch (error) {
      console.error("❌ [DETALLEVENTA] Error en createBatch:", error);
      throw error;
    }
  }

  // Obtener detalles por venta_id
  static async findByVentaId(ventaId) {
    try {
      const query = `
        SELECT 
          dv.*,
          p.nombre as producto_nombre,
          p.precio as producto_precio,
          p.codigo_barras
        FROM detalles_venta dv
        LEFT JOIN productos p ON dv.producto_id = p.id
        WHERE dv.venta_id = ?
        ORDER BY dv.created_at DESC
      `;

      const result = await db.execute(query, [ventaId]);
      console.log(
        `📦 [DETALLEVENTA] Encontrados ${
          result.rows?.length || 0
        } detalles para venta ${ventaId}`
      );

      return { rows: result.rows || [], count: result.rows?.length || 0 };
    } catch (error) {
      console.error("❌ [DETALLEVENTA] Error en findByVentaId:", error);
      return { rows: [], count: 0 };
    }
  }

  // Obtener detalle por ID
  static async findById(id) {
    try {
      const query = `
        SELECT 
          dv.*,
          p.nombre as producto_nombre,
          p.descripcion as producto_descripcion
        FROM detalles_venta dv
        LEFT JOIN productos p ON dv.producto_id = p.id
        WHERE dv.id = ?
      `;

      const result = await db.execute(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error("❌ [DETALLEVENTA] Error en findById:", error);
      return null;
    }
  }

  // Eliminar detalles por venta_id
  static async deleteByVentaId(ventaId) {
    try {
      const query = `DELETE FROM detalles_venta WHERE venta_id = ?`;
      const result = await db.execute(query, [ventaId]);
      console.log(`🗑️ [DETALLEVENTA] Eliminados detalles de venta: ${ventaId}`);
      return result.rowsAffected > 0;
    } catch (error) {
      console.error("❌ [DETALLEVENTA] Error en deleteByVentaId:", error);
      throw error;
    }
  }

  // Obtener estadísticas de productos vendidos
  static async getProductosMasVendidos(limite = 10) {
    try {
      const query = `
        SELECT 
          p.id,
          p.nombre,
          p.categoria_id,
          c.nombre as categoria_nombre,
          SUM(dv.cantidad) as total_vendido,
          SUM(dv.subtotal) as total_ingresos
        FROM detalles_venta dv
        LEFT JOIN productos p ON dv.producto_id = p.id
        LEFT JOIN categorias c ON p.categoria_id = c.id
        GROUP BY p.id, p.nombre
        ORDER BY total_vendido DESC
        LIMIT ?
      `;

      const result = await db.execute(query, [limite]);
      return result.rows || [];
    } catch (error) {
      console.error(
        "❌ [DETALLEVENTA] Error en getProductosMasVendidos:",
        error
      );
      return [];
    }
  }
}
