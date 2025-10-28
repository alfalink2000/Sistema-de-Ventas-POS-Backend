// models/SesionCaja.js - VERSIÓN COMPLETA ACTUALIZADA
import { db } from "../database/connection.js";

export class SesionCaja {
  // Obtener sesión abierta por vendedor
  static async findOpenByVendedor(vendedorId) {
    try {
      const query = `
        SELECT 
          sc.*,
          u.nombre as vendedor_nombre,
          u.username as vendedor_username
        FROM sesiones_caja sc
        LEFT JOIN users u ON sc.vendedor_id = u.id
        WHERE sc.vendedor_id = ? AND sc.estado = 'abierta' 
        ORDER BY sc.fecha_apertura DESC 
        LIMIT 1
      `;

      console.log(
        "🔍 [SESION] Buscando sesión abierta para vendedor:",
        vendedorId
      );
      const result = await db.execute(query, [vendedorId]);

      console.log(
        "📦 [SESION] Resultado findOpenByVendedor:",
        result.rows[0] ? "Encontrada" : "No encontrada"
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error("❌ [SESION] Error en findOpenByVendedor:", error);
      return null;
    }
  }

  // Crear nueva sesión
  static async create(sesionData) {
    try {
      const {
        vendedor_id,
        saldo_inicial = 0,
        observaciones = null,
      } = sesionData;

      const id = `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fechaApertura = new Date().toISOString();

      console.log("🔄 [SESION] Creando sesión con datos:", {
        id,
        vendedor_id,
        saldo_inicial,
        observaciones,
        fechaApertura,
      });

      const query = `
        INSERT INTO sesiones_caja 
        (id, fecha_apertura, saldo_inicial, vendedor_id, observaciones, estado) 
        VALUES (?, ?, ?, ?, ?, 'abierta')
      `;

      const result = await db.execute(query, [
        id,
        fechaApertura,
        parseFloat(saldo_inicial),
        vendedor_id,
        observaciones,
      ]);

      console.log("✅ [SESION] Sesión creada con ID:", id);
      return id;
    } catch (error) {
      console.error("❌ [SESION] Error en create:", error);
      throw error;
    }
  }

  // Obtener sesión por ID
  static async findById(id) {
    try {
      const query = `
        SELECT 
          sc.*,
          u.nombre as vendedor_nombre,
          u.username as vendedor_username
        FROM sesiones_caja sc
        LEFT JOIN users u ON sc.vendedor_id = u.id
        WHERE sc.id = ?
      `;

      console.log("🔍 [SESION] Buscando sesión por ID:", id);
      const result = await db.execute(query, [id]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error("❌ [SESION] Error en findById:", error);
      return null;
    }
  }

  // ✅ ACTUALIZADO: Cerrar sesión con observaciones
  static async close(sesionId, closeData) {
    try {
      const { saldo_final, observaciones = null } = closeData;

      console.log("🔄 [MODELO] Cerrando sesión:", {
        sesionId,
        saldo_final,
        tipo: typeof saldo_final,
        esNumero: !isNaN(saldo_final),
        observaciones,
      });

      // ✅ VALIDAR QUE SALDO_FINAL SEA NÚMERO VÁLIDO
      const saldoFinalNumero = parseFloat(saldo_final);
      if (isNaN(saldoFinalNumero) || !isFinite(saldoFinalNumero)) {
        throw new Error("Saldo final no es un número válido: " + saldo_final);
      }

      const query = `
      UPDATE sesiones_caja 
      SET 
        fecha_cierre = datetime('now'), 
        saldo_final = ?, 
        observaciones = ?,
        estado = 'cerrada',
        updated_at = datetime('now')
      WHERE id = ?
    `;

      console.log("🔍 [MODELO] Ejecutando query con valores:", [
        saldoFinalNumero,
        observaciones,
        sesionId,
      ]);

      const result = await db.execute(query, [
        saldoFinalNumero,
        observaciones,
        sesionId,
      ]);

      const success = result.rowsAffected > 0 || result.changes > 0;
      console.log("✅ [MODELO] Sesión cerrada exitosamente:", success);

      return success;
    } catch (error) {
      console.error("❌ [MODELO] Error en close:", error);
      throw error;
    }
  }

  // Obtener sesiones por vendedor
  static async findByVendedor(vendedorId, limite = 30) {
    try {
      const query = `
        SELECT 
          sc.*,
          u.nombre as vendedor_nombre,
          u.username as vendedor_username,
          COUNT(v.id) as total_ventas,
          COALESCE(SUM(v.total), 0) as ingresos_totales
        FROM sesiones_caja sc
        LEFT JOIN users u ON sc.vendedor_id = u.id
        LEFT JOIN ventas v ON sc.id = v.sesion_caja_id AND v.estado = 'completada'
        WHERE sc.vendedor_id = ? 
        GROUP BY sc.id, u.nombre, u.username
        ORDER BY sc.fecha_apertura DESC 
        LIMIT ?
      `;

      const result = await db.execute(query, [vendedorId, parseInt(limite)]);
      console.log(
        `📦 [SESION] ${result.rows.length} sesiones encontradas para vendedor`
      );

      return { rows: result.rows, count: result.rows.length };
    } catch (error) {
      console.error("❌ [SESION] Error en findByVendedor:", error);
      return { rows: [], count: 0 };
    }
  }

  // ✅ NUEVO: Obtener sesión con información extendida
  static async findByIdWithDetails(id) {
    try {
      const query = `
        SELECT 
          sc.*,
          u.nombre as vendedor_nombre,
          u.username as vendedor_username,
          COUNT(v.id) as total_ventas,
          COALESCE(SUM(v.total), 0) as ingresos_totales,
          COALESCE(SUM(CASE WHEN v.metodo_pago = 'efectivo' THEN v.total ELSE 0 END), 0) as ingresos_efectivo,
          COALESCE(SUM(CASE WHEN v.metodo_pago = 'tarjeta' THEN v.total ELSE 0 END), 0) as ingresos_tarjeta
        FROM sesiones_caja sc
        LEFT JOIN users u ON sc.vendedor_id = u.id
        LEFT JOIN ventas v ON sc.id = v.sesion_caja_id AND v.estado = 'completada'
        WHERE sc.id = ?
        GROUP BY sc.id, u.nombre, u.username
      `;

      const result = await db.execute(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error("❌ [SESION] Error en findByIdWithDetails:", error);
      return null;
    }
  }

  // Obtener todas las sesiones con paginación
  static async findAll({ limite = 30, pagina = 1, estado = null } = {}) {
    try {
      const offset = (pagina - 1) * limite;
      let whereClause = "";
      const params = [limite, offset];

      if (estado) {
        whereClause = "WHERE sc.estado = ?";
        params.unshift(estado);
      }

      const query = `
        SELECT 
          sc.*,
          u.nombre as vendedor_nombre,
          u.username as vendedor_username,
          COUNT(v.id) as total_ventas,
          COALESCE(SUM(v.total), 0) as ingresos_totales
        FROM sesiones_caja sc
        LEFT JOIN users u ON sc.vendedor_id = u.id
        LEFT JOIN ventas v ON sc.id = v.sesion_caja_id AND v.estado = 'completada'
        ${whereClause}
        GROUP BY sc.id, u.nombre, u.username
        ORDER BY sc.fecha_apertura DESC 
        LIMIT ? OFFSET ?
      `;

      const result = await db.execute(query, params);
      return { rows: result.rows, count: result.rows.length };
    } catch (error) {
      console.error("❌ [SESION] Error en findAll:", error);
      return { rows: [], count: 0 };
    }
  }

  // ✅ NUEVO: Verificar estructura de tabla
  static async _verificarEstructuraTabla() {
    try {
      console.log(
        "🔄 [SESION] Verificando estructura de tabla sesiones_caja..."
      );

      // Verificar si existe el campo observaciones
      const checkQuery = `SELECT name FROM pragma_table_info('sesiones_caja') WHERE name = 'observaciones'`;
      const result = await db.execute(checkQuery);

      if (result.rows.length === 0) {
        console.log("🔄 [SESION] Agregando campo observaciones");
        const alterQuery = `ALTER TABLE sesiones_caja ADD COLUMN observaciones TEXT`;
        await db.execute(alterQuery);
      }

      console.log("✅ [SESION] Estructura de tabla verificada");
    } catch (error) {
      console.error("❌ [SESION] Error verificando estructura:", error);
    }
  }

  // ✅ NUEVO: Obtener sesiones recientes
  static async findRecent(limite = 10) {
    try {
      const query = `
        SELECT 
          sc.*,
          u.nombre as vendedor_nombre,
          COUNT(v.id) as total_ventas
        FROM sesiones_caja sc
        LEFT JOIN users u ON sc.vendedor_id = u.id
        LEFT JOIN ventas v ON sc.id = v.sesion_caja_id AND v.estado = 'completada'
        GROUP BY sc.id, u.nombre
        ORDER BY sc.fecha_apertura DESC 
        LIMIT ?
      `;

      const result = await db.execute(query, [limite]);
      return result.rows || [];
    } catch (error) {
      console.error("❌ [SESION] Error en findRecent:", error);
      return [];
    }
  }

  // ✅ NUEVO: Verificar si hay sesiones abiertas
  static async hasOpenSessions(vendedorId = null) {
    try {
      let query = `SELECT COUNT(*) as count FROM sesiones_caja WHERE estado = 'abierta'`;
      const params = [];

      if (vendedorId) {
        query += ` AND vendedor_id = ?`;
        params.push(vendedorId);
      }

      const result = await db.execute(query, params);
      return result.rows[0]?.count > 0;
    } catch (error) {
      console.error("❌ [SESION] Error en hasOpenSessions:", error);
      return false;
    }
  }
}
