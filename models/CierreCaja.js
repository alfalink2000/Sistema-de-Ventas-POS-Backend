// models/CierreCaja.js - VERSIÓN COMPLETA ACTUALIZADA
import { db } from "../database/connection.js";

export class CierreCaja {
  // Obtener todos los cierres con paginación
  static async findAll({ limite = 30, pagina = 1 } = {}) {
    try {
      const offset = (pagina - 1) * limite;

      console.log(
        `🔍 [CIERRE] Buscando cierres - límite: ${limite}, offset: ${offset}`
      );

      const query = `
        SELECT 
          cc.*,
          sc.fecha_apertura,
          sc.saldo_inicial,
          sc.observaciones as sesion_observaciones,
          u.nombre as vendedor_nombre,
          u.username as vendedor_username
        FROM cierres_caja cc
        LEFT JOIN sesiones_caja sc ON cc.sesion_caja_id = sc.id
        LEFT JOIN users u ON cc.vendedor_id = u.id
        ORDER BY cc.fecha_cierre DESC
        LIMIT ? OFFSET ?
      `;

      const result = await db.execute(query, [limite, offset]);
      console.log(
        `✅ [CIERRE] ${result.rows?.length || 0} cierres encontrados`
      );

      return result.rows || [];
    } catch (error) {
      console.error("❌ [CIERRE] Error en findAll:", error);

      // Si hay error de tabla, verificar estructura
      if (
        error.message.includes("no such table") ||
        error.message.includes("no such column")
      ) {
        console.log("🔄 [CIERRE] Verificando estructura de tabla...");
        await this._verificarEstructuraTabla();
        return [];
      }

      return [];
    }
  }

  // Obtener cierre por ID
  static async findById(id) {
    try {
      const query = `
        SELECT 
          cc.*,
          sc.fecha_apertura,
          sc.saldo_inicial,
          sc.observaciones as sesion_observaciones,
          u.nombre as vendedor_nombre,
          u.username as vendedor_username
        FROM cierres_caja cc
        LEFT JOIN sesiones_caja sc ON cc.sesion_caja_id = sc.id
        LEFT JOIN users u ON cc.vendedor_id = u.id
        WHERE cc.id = ?
      `;

      const result = await db.execute(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error("❌ [CIERRE] Error en findById:", error);
      return null;
    }
  }

  // Obtener cierre por fecha
  static async findByDate(fecha) {
    try {
      console.log(`🔍 [CIERRE] Buscando cierre por fecha: ${fecha}`);

      const query = `
        SELECT 
          cc.*,
          sc.fecha_apertura,
          sc.saldo_inicial,
          u.nombre as vendedor_nombre
        FROM cierres_caja cc
        LEFT JOIN sesiones_caja sc ON cc.sesion_caja_id = sc.id
        LEFT JOIN users u ON cc.vendedor_id = u.id
        WHERE date(cc.fecha_cierre) = date(?)
        ORDER BY cc.fecha_cierre DESC 
        LIMIT 1
      `;

      const result = await db.execute(query, [fecha]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error("❌ [CIERRE] Error en findByDate:", error);
      return null;
    }
  }

  // ✅ NUEVO: Calcular totales para cierre
  static async calcularTotales(sesionCajaId) {
    try {
      console.log(
        `🧮 [CIERRE] Calculando totales para sesión: ${sesionCajaId}`
      );

      // 1. Obtener sesión para saldo inicial
      const sesionQuery = `SELECT saldo_inicial FROM sesiones_caja WHERE id = ?`;
      const sesionResult = await db.execute(sesionQuery, [sesionCajaId]);
      const saldoInicial = sesionResult.rows[0]?.saldo_inicial || 0;

      // 2. Obtener totales de ventas
      const ventasQuery = `
        SELECT 
          COUNT(*) as cantidad_ventas,
          SUM(total) as total_ventas,
          SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END) as total_efectivo,
          SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END) as total_tarjeta,
          SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END) as total_transferencia
        FROM ventas 
        WHERE sesion_caja_id = ? AND estado = 'completada'
      `;

      const ventasResult = await db.execute(ventasQuery, [sesionCajaId]);
      const ventasTotales = ventasResult.rows[0] || {
        cantidad_ventas: 0,
        total_ventas: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        total_transferencia: 0,
      };

      // 3. ✅ CALCULAR GANANCIA BRUTA (precio_venta - precio_compra)
      const gananciaQuery = `
        SELECT 
          SUM((dv.precio_unitario - p.precio_compra) * dv.cantidad) as ganancia_bruta
        FROM detalles_venta dv
        INNER JOIN ventas v ON dv.venta_id = v.id
        INNER JOIN productos p ON dv.producto_id = p.id
        WHERE v.sesion_caja_id = ? AND v.estado = 'completada'
      `;

      const gananciaResult = await db.execute(gananciaQuery, [sesionCajaId]);
      const gananciaBruta = gananciaResult.rows[0]?.ganancia_bruta || 0;

      // 4. Calcular saldo final teórico
      const saldoFinalTeorico =
        parseFloat(saldoInicial) + parseFloat(ventasTotales.total_efectivo);

      const resultado = {
        cantidad_ventas: parseInt(ventasTotales.cantidad_ventas) || 0,
        total_ventas: parseFloat(ventasTotales.total_ventas) || 0,
        total_efectivo: parseFloat(ventasTotales.total_efectivo) || 0,
        total_tarjeta: parseFloat(ventasTotales.total_tarjeta) || 0,
        total_transferencia: parseFloat(ventasTotales.total_transferencia) || 0,
        ganancia_bruta: parseFloat(gananciaBruta) || 0,
        saldo_inicial: parseFloat(saldoInicial) || 0,
        saldo_final_teorico: saldoFinalTeorico,
      };

      console.log("✅ [CIERRE] Totales calculados:", resultado);
      return resultado;
    } catch (error) {
      console.error("❌ [CIERRE] Error en calcularTotales:", error);

      // Retornar valores por defecto en caso de error
      return {
        cantidad_ventas: 0,
        total_ventas: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        total_transferencia: 0,
        ganancia_bruta: 0,
        saldo_inicial: 0,
        saldo_final_teorico: 0,
      };
    }
  }

  // ✅ ACTUALIZADO: Crear cierre con nuevos campos
  static async create(cierreData) {
    try {
      const {
        sesion_caja_id,
        total_ventas,
        total_efectivo,
        total_tarjeta,
        total_transferencia = 0,
        ganancia_bruta,
        saldo_final_teorico,
        saldo_final_real,
        diferencia,
        observaciones,
        vendedor_id,
        estado = "completado",
      } = cierreData;

      console.log("🔄 [CIERRE] Creando cierre completo:", cierreData);

      const query = `
        INSERT INTO cierres_caja (
          id, sesion_caja_id, total_ventas, total_efectivo, total_tarjeta, total_transferencia,
          ganancia_bruta, saldo_final_teorico, saldo_final_real, diferencia,
          observaciones, vendedor_id, fecha_cierre, estado, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'))
      `;

      const id = `cierre_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const result = await db.execute(query, [
        id,
        sesion_caja_id,
        parseFloat(total_ventas) || 0,
        parseFloat(total_efectivo) || 0,
        parseFloat(total_tarjeta) || 0,
        parseFloat(total_transferencia) || 0,
        parseFloat(ganancia_bruta) || 0,
        parseFloat(saldo_final_teorico) || 0,
        parseFloat(saldo_final_real) || 0,
        parseFloat(diferencia) || 0,
        observaciones,
        vendedor_id,
        estado,
      ]);

      console.log("✅ [CIERRE] Cierre creado con ID:", id);
      return id;
    } catch (error) {
      console.error("❌ [CIERRE] Error en create:", error);
      throw error;
    }
  }

  // Actualizar cierre
  static async update(id, updates) {
    try {
      const allowedFields = [
        "total_ventas",
        "total_efectivo",
        "total_tarjeta",
        "total_transferencia",
        "ganancia_bruta",
        "saldo_final_teorico",
        "saldo_final_real",
        "diferencia",
        "observaciones",
        "estado",
      ];

      const fields = [];
      const values = [];

      Object.keys(updates).forEach((key) => {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });

      if (fields.length === 0) {
        throw new Error("No hay campos válidos para actualizar");
      }

      values.push(id);
      const query = `
        UPDATE cierres_caja 
        SET ${fields.join(", ")}, updated_at = datetime('now')
        WHERE id = ?
      `;

      const result = await db.execute(query, values);
      return result.rowsAffected > 0 || result.changes > 0;
    } catch (error) {
      console.error("❌ [CIERRE] Error en update:", error);
      throw error;
    }
  }

  // Eliminar cierre
  static async delete(id) {
    try {
      const query = `DELETE FROM cierres_caja WHERE id = ?`;
      const result = await db.execute(query, [id]);
      console.log(`🗑️ [CIERRE] Cierre ${id} eliminado`);
      return result.rowsAffected > 0 || result.changes > 0;
    } catch (error) {
      console.error("❌ [CIERRE] Error en delete:", error);
      throw error;
    }
  }

  // ✅ NUEVO: Verificar estructura de tabla
  static async _verificarEstructuraTabla() {
    try {
      console.log(
        "🔄 [CIERRE] Verificando estructura de tabla cierres_caja..."
      );

      // Verificar si existen los nuevos campos
      const checkQuery = `SELECT name FROM pragma_table_info('cierres_caja') WHERE name IN ('ganancia_bruta', 'saldo_final_teorico', 'saldo_final_real', 'diferencia', 'total_transferencia')`;
      const result = await db.execute(checkQuery);
      const existingFields = result.rows.map((row) => row.name);

      console.log("📋 [CIERRE] Campos existentes:", existingFields);

      // Agregar campos faltantes
      const fieldsToAdd = [
        { name: "ganancia_bruta", type: "REAL DEFAULT 0" },
        { name: "saldo_final_teorico", type: "REAL DEFAULT 0" },
        { name: "saldo_final_real", type: "REAL DEFAULT 0" },
        { name: "diferencia", type: "REAL DEFAULT 0" },
        { name: "total_transferencia", type: "REAL DEFAULT 0" },
      ];

      for (const field of fieldsToAdd) {
        if (!existingFields.includes(field.name)) {
          console.log(`🔄 [CIERRE] Agregando campo: ${field.name}`);
          const alterQuery = `ALTER TABLE cierres_caja ADD COLUMN ${field.name} ${field.type}`;
          await db.execute(alterQuery);
        }
      }

      console.log("✅ [CIERRE] Estructura de tabla verificada");
    } catch (error) {
      console.error("❌ [CIERRE] Error verificando estructura:", error);
    }
  }

  // ✅ NUEVO: Obtener estadísticas de cierres
  static async getEstadisticas(desde, hasta) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_cierres,
          SUM(total_ventas) as ventas_totales,
          SUM(ganancia_bruta) as ganancia_total,
          AVG(diferencia) as diferencia_promedio,
          SUM(CASE WHEN diferencia = 0 THEN 1 ELSE 0 END) as cierres_exactos,
          SUM(CASE WHEN diferencia > 0 THEN 1 ELSE 0 END) as cierres_sobrante,
          SUM(CASE WHEN diferencia < 0 THEN 1 ELSE 0 END) as cierres_faltante
        FROM cierres_caja 
        WHERE fecha_cierre BETWEEN ? AND ?
      `;

      const result = await db.execute(query, [desde, hasta]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error("❌ [CIERRE] Error en getEstadisticas:", error);
      return null;
    }
  }
}
