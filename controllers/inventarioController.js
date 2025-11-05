// controllers/inventarioController.js - VERSIÓN COMPLETA CON SINCRONIZACIÓN BIDIRECCIONAL
import { Inventario } from "../models/Inventario.js";
import { Producto } from "../models/Producto.js";
import { db } from "../database/connection.js";
import bcrypt from "bcrypt";

export const obtenerInventario = async (req, res) => {
  try {
    const inventario = await Inventario.findAll({ producto_activo: true });

    console.log(
      `📦 [CONTROLLER] Inventario obtenido: ${inventario.length} items`
    );

    res.json({
      ok: true,
      inventario,
      total: inventario.length,
    });
  } catch (error) {
    console.error("❌ Error al obtener inventario:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener inventario",
    });
  }
};

// ✅ ACTUALIZAR STOCK - CON SINCRONIZACIÓN BIDIRECCIONAL
export const actualizarStock = async (req, res) => {
  try {
    const { productoId } = req.params;
    const { stock, adminPassword, origen = "manual" } = req.body;

    console.log(
      `🔄 [INVENTARIO] Actualizando stock: ${productoId} -> ${stock} (Origen: ${origen})`
    );

    if (!stock && stock !== 0) {
      return res.status(400).json({
        ok: false,
        error: "El campo 'stock' es requerido",
      });
    }

    // ✅ VERIFICAR QUE EL PRODUCTO EXISTA
    const producto = await Producto.findById(productoId);
    if (!producto) {
      return res.status(404).json({
        ok: false,
        error: "Producto no encontrado",
      });
    }

    const stockNum = parseInt(stock);

    // ✅ VERIFICAR PERMISOS (solo si no es una actualización automática desde venta)
    if (origen !== "venta" && req.uid) {
      try {
        const usuarioResult = await db.query(
          "SELECT rol FROM users WHERE id = ? AND activo = true",
          [req.uid]
        );

        const usuario = usuarioResult.rows ? usuarioResult.rows[0] : null;

        if (usuario && usuario.rol !== "admin") {
          console.log(
            "🔐 Usuario no es admin, validando contraseña de admin..."
          );

          if (!adminPassword) {
            return res.status(403).json({
              ok: false,
              error:
                "Se requiere autorización de administrador para actualizar stock",
            });
          }

          // Verificar contraseña de administrador
          const adminUserResult = await db.query(
            "SELECT * FROM users WHERE rol = 'admin' AND activo = true LIMIT 1"
          );

          const adminUser = adminUserResult.rows
            ? adminUserResult.rows[0]
            : null;

          if (!adminUser) {
            return res.status(400).json({
              ok: false,
              error:
                "No hay administradores en el sistema para validar esta acción",
            });
          }

          // ✅ VERIFICAR CONTRASEÑA
          const validAdminPassword = await bcrypt.compare(
            adminPassword,
            adminUser.password_hash
          );

          if (!validAdminPassword) {
            return res.status(400).json({
              ok: false,
              error: "Contraseña de administrador incorrecta",
            });
          }
        }
      } catch (userError) {
        console.error("❌ Error verificando permisos:", userError);
      }
    }

    // ✅ SINCRONIZACIÓN BIDIRECCIONAL: ACTUALIZAR AMBAS TABLAS
    console.log("💾 Sincronizando stock en PRODUCTOS...");
    const resultadoProducto = await Producto.actualizarStock(
      productoId,
      stockNum
    );

    if (!resultadoProducto) {
      throw new Error("No se pudo actualizar stock en productos");
    }

    console.log("📊 Sincronizando stock en INVENTARIO...");
    const resultadoInventario = await Inventario.createOrUpdate(productoId, {
      stock_actual: stockNum,
      fecha_actualizacion: new Date().toISOString(),
    });

    if (!resultadoInventario) {
      throw new Error("No se pudo actualizar el inventario");
    }

    console.log(
      `✅ [INVENTARIO] Stock sincronizado: ${productoId} -> ${stockNum}`
    );

    // ✅ OBTENER DATOS ACTUALIZADOS DE AMBAS TABLAS
    const productoActualizado = await Producto.findById(productoId);
    const inventarioActualizado = await Inventario.findByProductoId(productoId);

    res.json({
      ok: true,
      message: "Stock sincronizado exitosamente en ambas tablas",
      productoId,
      stock_anterior: producto.stock,
      stock_nuevo: stockNum,
      producto: productoActualizado,
      inventario: inventarioActualizado,
      sincronizado: true,
      origen: origen,
    });
  } catch (error) {
    console.error("❌ Error al actualizar stock bidireccional:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Error interno al actualizar stock",
      sincronizado: false,
    });
  }
};

export const obtenerProductosBajoStock = async (req, res) => {
  try {
    const productosBajoStock = await Inventario.findStockBajo();

    console.log(
      `⚠️ [CONTROLLER] Productos bajo stock: ${productosBajoStock.length}`
    );

    res.json({
      ok: true,
      productos: productosBajoStock,
      total: productosBajoStock.length,
    });
  } catch (error) {
    console.error("❌ Error al obtener productos bajo stock:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener productos bajo stock",
    });
  }
};

// ✅ FUNCIÓN DE SINCRONIZACIÓN
export const sincronizarInventario = async (req, res) => {
  try {
    const { cambios } = req.body;

    console.log(
      `🔄 [CONTROLLER] Sincronizando ${
        cambios?.length || 0
      } cambios de inventario...`
    );

    let cambiosProcesados = 0;
    let errores = [];

    if (cambios && Array.isArray(cambios)) {
      for (const cambio of cambios) {
        try {
          const { producto_id, stock_actual, stock_minimo, operacion } = cambio;

          if (operacion === "actualizar" && producto_id) {
            // ✅ SINCRONIZAR AMBAS TABLAS
            await Producto.actualizarStock(producto_id, parseInt(stock_actual));
            await Inventario.createOrUpdate(producto_id, {
              stock_actual: parseInt(stock_actual),
              stock_minimo: parseInt(stock_minimo || 5),
            });
            cambiosProcesados++;
          }
        } catch (error) {
          console.error(`❌ Error procesando cambio:`, cambio, error);
          errores.push({
            producto_id: cambio.producto_id,
            error: error.message,
          });
        }
      }
    }

    res.json({
      ok: true,
      message: "Inventario sincronizado exitosamente",
      cambios_procesados: cambiosProcesados,
      total_cambios: cambios?.length || 0,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error) {
    console.error("❌ Error en sincronización de inventario:", error);
    res.status(500).json({
      ok: false,
      error: "Error durante la sincronización del inventario",
    });
  }
};

// ✅ NUEVA FUNCIÓN: Sincronizar todos los productos con inventario
export const sincronizarProductosConInventario = async (req, res) => {
  try {
    console.log("🔄 INICIANDO SINCRONIZACIÓN PRODUCTOS ↔ INVENTARIO");

    // Obtener todos los productos activos
    const productos = await Producto.findAll({ activo: true });
    console.log(`📦 Productos a sincronizar: ${productos.length}`);

    let sincronizados = 0;
    let errores = [];

    for (const producto of productos) {
      try {
        console.log(
          `🔄 Sincronizando producto: ${producto.nombre} (Stock: ${producto.stock})`
        );

        // Sincronizar inventario con los valores del producto
        await Inventario.createOrUpdate(producto.id, {
          stock_actual: producto.stock,
          stock_minimo: producto.stock_minimo || 5,
        });

        sincronizados++;
        console.log(`✅ Producto sincronizado: ${producto.nombre}`);
      } catch (error) {
        console.error(`❌ Error sincronizando ${producto.nombre}:`, error);
        errores.push({
          producto: producto.nombre,
          error: error.message,
        });
      }
    }

    res.json({
      ok: true,
      message: `Sincronización completada: ${sincronizados} productos sincronizados`,
      total_productos: productos.length,
      sincronizados,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error) {
    console.error("❌ Error en sincronización masiva:", error);
    res.status(500).json({
      ok: false,
      error: "Error durante la sincronización masiva",
    });
  }
};

// ✅ NUEVA FUNCIÓN: Verificar inconsistencias
export const verificarInconsistencias = async (req, res) => {
  try {
    console.log("🔍 VERIFICANDO INCONSISTENCIAS ENTRE PRODUCTOS E INVENTARIO");

    const sql = `
      SELECT 
        p.id,
        p.nombre,
        p.stock as stock_producto,
        i.stock_actual as stock_inventario,
        p.stock_minimo as minimo_producto,
        i.stock_minimo as minimo_inventario,
        CASE 
          WHEN p.stock != i.stock_actual THEN 'STOCK_DIFERENTE'
          WHEN p.stock_minimo != i.stock_minimo THEN 'MINIMO_DIFERENTE'
          ELSE 'OK'
        END as estado
      FROM productos p
      LEFT JOIN inventario i ON p.id = i.producto_id
      WHERE p.activo = true
      ORDER BY estado DESC
    `;

    const result = await db.query(sql);
    const inconsistencias = result.rows.filter((row) => row.estado !== "OK");

    res.json({
      ok: true,
      total_productos: result.rows.length,
      inconsistencias: inconsistencias.length,
      detalles: result.rows,
    });
  } catch (error) {
    console.error("❌ Error verificando inconsistencias:", error);
    res.status(500).json({
      ok: false,
      error: "Error al verificar inconsistencias",
    });
  }
};
