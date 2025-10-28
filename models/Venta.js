// models/Venta.js - VERSIÓN COMPLETA CORREGIDA
import { db } from "../database/connection.js";

export class Venta {
  // Crear nueva venta
  static async create(ventaData) {
    try {
      const {
        sesion_caja_id,
        vendedor_id,
        total,
        metodo_pago,
        efectivo_recibido,
        cambio,
        estado,
      } = ventaData;

      console.log("🔄 [VENTA] Creando venta con datos:", ventaData);

      const query = `
        INSERT INTO ventas (
          id, sesion_caja_id, vendedor_id, total, metodo_pago, 
          efectivo_recibido, cambio, estado, fecha_venta, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `;

      const id = `venta_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const result = await db.execute(query, [
        id,
        sesion_caja_id,
        vendedor_id,
        parseFloat(total),
        metodo_pago || "efectivo",
        efectivo_recibido ? parseFloat(efectivo_recibido) : null,
        cambio ? parseFloat(cambio) : null,
        estado || "completada",
      ]);

      console.log("✅ [VENTA] Venta creada con ID:", id);
      return id;
    } catch (error) {
      console.error("❌ [VENTA] Error en create:", error);
      throw error;
    }
  }

  // Eliminar venta por ID
  static async deleteById(id) {
    try {
      const query = `DELETE FROM ventas WHERE id = ?`;
      const result = await db.execute(query, [id]);
      console.log(`🗑️ [VENTA] Venta ${id} eliminada`);
      return result.rowsAffected > 0;
    } catch (error) {
      console.error("❌ [VENTA] Error en deleteById:", error);
      return false;
    }
  }

  // Obtener ventas por sesión de caja
  static async findBySesionCaja(sesionCajaId) {
    try {
      console.log(`🔍 [VENTA] Buscando ventas para sesión: ${sesionCajaId}`);

      const query = `
        SELECT 
          v.*,
          u.nombre as vendedor_nombre
        FROM ventas v
        LEFT JOIN users u ON v.vendedor_id = u.id
        WHERE v.sesion_caja_id = ? 
        AND v.estado = 'completada'
        ORDER BY v.fecha_venta DESC
      `;

      const result = await db.execute(query, [sesionCajaId]);
      console.log(
        `✅ [VENTA] Encontradas ${
          result.rows?.length || 0
        } ventas para la sesión`
      );

      return result.rows || [];
    } catch (error) {
      console.error("❌ [VENTA] Error en findBySesionCaja:", error);
      return [];
    }
  }

  // Obtener todas las ventas
  static async findAll({ limite = 50, pagina = 1 } = {}) {
    try {
      const offset = (pagina - 1) * limite;

      const query = `
        SELECT 
          v.*,
          u.nombre as vendedor_nombre,
          sc.fecha_apertura
        FROM ventas v
        LEFT JOIN users u ON v.vendedor_id = u.id
        LEFT JOIN sesiones_caja sc ON v.sesion_caja_id = sc.id
        ORDER BY v.fecha_venta DESC 
        LIMIT ? OFFSET ?
      `;

      const result = await db.execute(query, [limite, offset]);
      return result.rows || [];
    } catch (error) {
      console.error("❌ [VENTA] Error en findAll:", error);
      return [];
    }
  }

  // Obtener venta por ID
  static async findById(id) {
    try {
      const query = `
        SELECT 
          v.*,
          u.nombre as vendedor_nombre,
          sc.fecha_apertura,
          sc.saldo_inicial
        FROM ventas v
        LEFT JOIN users u ON v.vendedor_id = u.id
        LEFT JOIN sesiones_caja sc ON v.sesion_caja_id = sc.id
        WHERE v.id = ?
      `;

      const result = await db.execute(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error("❌ [VENTA] Error en findById:", error);
      return null;
    }
  }

  // Obtener ventas por fecha
  static async findByDate(fecha) {
    try {
      const query = `
        SELECT 
          v.*,
          u.nombre as vendedor_nombre
        FROM ventas v
        LEFT JOIN users u ON v.vendedor_id = u.id
        WHERE DATE(v.fecha_venta) = ?
        ORDER BY v.fecha_venta DESC
      `;

      const result = await db.execute(query, [fecha]);
      return result.rows || [];
    } catch (error) {
      console.error("❌ [VENTA] Error en findByDate:", error);
      return [];
    }
  }

  // Obtener totales por sesión de caja
  static async getTotalesBySesion(sesionCajaId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_ventas,
          SUM(total) as total_ingresos,
          SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END) as total_efectivo,
          SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END) as total_tarjeta,
          SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END) as total_transferencia
        FROM ventas 
        WHERE sesion_caja_id = ? 
        AND estado = 'completada'
      `;

      const result = await db.execute(query, [sesionCajaId]);
      return result.rows.length > 0
        ? result.rows[0]
        : {
            total_ventas: 0,
            total_ingresos: 0,
            total_efectivo: 0,
            total_tarjeta: 0,
            total_transferencia: 0,
          };
    } catch (error) {
      console.error("❌ [VENTA] Error en getTotalesBySesion:", error);
      return {
        total_ventas: 0,
        total_ingresos: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        total_transferencia: 0,
      };
    }
  }

  // Actualizar estado de venta
  static async updateEstado(id, estado) {
    try {
      const query = `
        UPDATE ventas 
        SET estado = ?, updated_at = datetime('now')
        WHERE id = ?
      `;

      const result = await db.execute(query, [estado, id]);
      return result.rowsAffected > 0;
    } catch (error) {
      console.error("❌ [VENTA] Error en updateEstado:", error);
      return false;
    }
  }
}
