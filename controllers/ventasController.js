// controllers/ventasController.js - VERSIÓN COMPLETA CON TODOS LOS EXPORTS
import { Venta } from "../models/Venta.js";
import { DetalleVenta } from "../models/DetalleVenta.js";
import { db } from "../database/connection.js";

export const crearVenta = async (req, res) => {
  try {
    console.log("📥 [BACKEND] Datos recibidos en crearVenta:", req.body);

    const {
      productos,
      total,
      vendedor_id,
      sesion_caja_id,
      metodo_pago,
      efectivo_recibido,
      cambio,
      estado,
    } = req.body;

    // ✅ VALIDACIONES MEJORADAS
    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      console.log("❌ [BACKEND] Error: No hay productos");
      return res.status(400).json({
        ok: false,
        error: "La venta debe contener al menos un producto",
      });
    }

    // ✅ VALIDAR QUE TODOS LOS PRODUCTOS TENGAN ID VÁLIDO
    const productosSinId = productos.filter(
      (p) => !p.producto_id || p.producto_id === ""
    );
    if (productosSinId.length > 0) {
      console.log(
        "❌ [BACKEND] Error: Productos sin ID válido:",
        productosSinId
      );
      return res.status(400).json({
        ok: false,
        error: `Los siguientes productos no tienen ID válido: ${productosSinId
          .map((p) => p.nombre || "Producto sin nombre")
          .join(", ")}`,
      });
    }

    // ✅ VERIFICAR QUE LOS PRODUCTOS EXISTAN EN LA BD
    try {
      for (const producto of productos) {
        const productQuery = `SELECT id, nombre, precio FROM productos WHERE id = ?`;
        const productResult = await db.execute(productQuery, [
          producto.producto_id.toString(),
        ]);

        if (productResult.rows.length === 0) {
          console.log(
            `❌ [BACKEND] Producto no encontrado: ${producto.producto_id}`
          );
          return res.status(400).json({
            ok: false,
            error: `El producto con ID ${producto.producto_id} no existe en la base de datos`,
          });
        } else {
          console.log(
            `✅ [BACKEND] Producto verificado:`,
            productResult.rows[0]
          );
        }
      }
    } catch (error) {
      console.error("❌ [BACKEND] Error verificando productos:", error);
      return res.status(500).json({
        ok: false,
        error: "Error al verificar la existencia de los productos",
      });
    }

    if (!total || total <= 0) {
      console.log("❌ [BACKEND] Error: Total inválido");
      return res.status(400).json({
        ok: false,
        error: "El total debe ser mayor a 0",
      });
    }

    if (!vendedor_id) {
      console.log("❌ [BACKEND] Error: No hay vendedor_id");
      return res.status(400).json({
        ok: false,
        error: "Vendedor requerido",
      });
    }

    if (!sesion_caja_id) {
      console.log("❌ [BACKEND] Error: No hay sesion_caja_id");
      return res.status(400).json({
        ok: false,
        error: "Sesión de caja requerida",
      });
    }

    console.log("✅ [BACKEND] Datos validados correctamente");

    const ventaData = {
      sesion_caja_id: sesion_caja_id,
      vendedor_id: vendedor_id,
      total: parseFloat(total),
      metodo_pago: metodo_pago || "efectivo",
      efectivo_recibido: efectivo_recibido
        ? parseFloat(efectivo_recibido)
        : null,
      cambio: cambio ? parseFloat(cambio) : null,
      estado: estado || "completada",
    };

    console.log("🔄 [BACKEND] Creando venta con datos:", ventaData);

    let ventaId;
    try {
      // 1. Crear la venta
      ventaId = await Venta.create(ventaData);

      if (!ventaId) {
        throw new Error("Error al crear la venta");
      }

      console.log("✅ [BACKEND] Venta creada con ID:", ventaId);

      // 2. Crear los detalles de venta
      const detallesData = productos.map((producto) => ({
        venta_id: ventaId,
        producto_id: producto.producto_id.toString(),
        cantidad: parseInt(producto.cantidad),
        precio_unitario: parseFloat(producto.precio_unitario),
        subtotal: parseFloat(
          producto.subtotal || producto.cantidad * producto.precio_unitario
        ),
      }));

      console.log("🔄 [BACKEND] Creando detalles de venta:", detallesData);

      await DetalleVenta.createBatch(detallesData);
      console.log("✅ [BACKEND] Detalles de venta creados exitosamente");
    } catch (error) {
      console.error("❌ [BACKEND] Error durante la creación:", error);

      // Si falla, eliminar la venta creada (si se llegó a crear)
      if (ventaId) {
        await Venta.deleteById(ventaId);
        console.log("🗑️ [BACKEND] Venta eliminada debido a error");
      }

      return res.status(500).json({
        ok: false,
        error: "Error al procesar la venta: " + error.message,
      });
    }

    // 3. Obtener la venta creada con sus detalles
    const ventaCreada = await Venta.findById(ventaId);
    const detalles = await DetalleVenta.findByVentaId(ventaId);

    const respuesta = {
      id: ventaId,
      ...ventaData,
      productos: detalles.rows || [],
      fecha_venta: ventaCreada?.fecha_venta || new Date().toISOString(),
    };

    console.log("✅ [BACKEND] Venta completada exitosamente:", ventaId);

    res.status(201).json({
      ok: true,
      message: "Venta creada exitosamente",
      venta: respuesta,
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error en crearVenta:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al procesar la venta",
      details: error.message,
    });
  }
};

export const obtenerVentas = async (req, res) => {
  try {
    console.log("📥 [BACKEND] GET /api/ventas recibida");
    const { limite = 50, pagina = 1 } = req.query;

    const ventas = await Venta.findAll({
      limite: parseInt(limite),
      pagina: parseInt(pagina),
    });

    console.log(`📤 [BACKEND] Enviando ${ventas.length} ventas`);

    res.json({
      ok: true,
      ventas,
      paginacion: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total: ventas.length,
      },
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error en obtenerVentas:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener ventas",
    });
  }
};

export const obtenerVentaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📥 [BACKEND] Obteniendo venta con ID: ${id}`);

    const venta = await Venta.findById(id);

    if (!venta) {
      return res.status(404).json({
        ok: false,
        error: "Venta no encontrada",
      });
    }

    // Obtener detalles de la venta
    const detalles = await DetalleVenta.findByVentaId(id);

    const ventaCompleta = {
      ...venta,
      productos: detalles.rows || [],
    };

    res.json({
      ok: true,
      venta: ventaCompleta,
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error en obtenerVentaPorId:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener la venta",
    });
  }
};

export const obtenerVentasPorSesion = async (req, res) => {
  try {
    const { sesionId } = req.params;
    console.log(`📥 [BACKEND] Obteniendo ventas para sesión: ${sesionId}`);

    const ventas = await Venta.findBySesionCaja(sesionId);
    const totales = await Venta.getTotalesBySesion(sesionId);

    res.json({
      ok: true,
      ventas,
      totales,
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error en obtenerVentasPorSesion:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener ventas por sesión",
    });
  }
};

// ✅ AGREGAR LA FUNCIÓN FALTANTE
export const obtenerVentasPorFecha = async (req, res) => {
  try {
    const { fecha } = req.params;
    console.log(`📥 [BACKEND] Obteniendo ventas para fecha: ${fecha}`);

    // Validar formato de fecha
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({
        ok: false,
        error: "Formato de fecha inválido. Use YYYY-MM-DD",
      });
    }

    const ventas = await Venta.findByDate(fecha);

    res.json({
      ok: true,
      fecha,
      total_ventas: ventas.length,
      ventas,
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error en obtenerVentasPorFecha:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener ventas por fecha",
    });
  }
};

export const obtenerEstadisticasVentas = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    console.log(
      `📊 [BACKEND] Obteniendo estadísticas desde ${fecha_inicio} hasta ${fecha_fin}`
    );

    let ventas = await Venta.findAll();

    // Filtrar por fecha si se proporciona
    if (fecha_inicio && fecha_fin) {
      ventas = ventas.filter((venta) => {
        const fechaVenta = new Date(venta.fecha_venta)
          .toISOString()
          .split("T")[0];
        return fechaVenta >= fecha_inicio && fechaVenta <= fecha_fin;
      });
    }

    const estadisticas = {
      total_ventas: ventas.length,
      total_ingresos: ventas.reduce(
        (sum, venta) => sum + parseFloat(venta.total || 0),
        0
      ),
      ventas_por_metodo: {
        efectivo: ventas.filter((v) => v.metodo_pago === "efectivo").length,
        tarjeta: ventas.filter((v) => v.metodo_pago === "tarjeta").length,
        transferencia: ventas.filter((v) => v.metodo_pago === "transferencia")
          .length,
      },
      productos_mas_vendidos: await DetalleVenta.getProductosMasVendidos(10),
    };

    // Agrupar ventas por día
    const ventasPorDia = {};
    ventas.forEach((venta) => {
      const fecha = new Date(venta.fecha_venta).toISOString().split("T")[0];
      if (!ventasPorDia[fecha]) {
        ventasPorDia[fecha] = {
          fecha,
          ventas: 0,
          ingresos: 0,
        };
      }
      ventasPorDia[fecha].ventas++;
      ventasPorDia[fecha].ingresos += parseFloat(venta.total || 0);
    });

    estadisticas.ventas_por_dia = Object.values(ventasPorDia);

    res.json({
      ok: true,
      estadisticas,
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error en obtenerEstadisticasVentas:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener estadísticas",
    });
  }
};

export const cancelarVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    console.log(`🔄 [BACKEND] Cancelando venta: ${id}`, { motivo });

    const venta = await Venta.findById(id);
    if (!venta) {
      return res.status(404).json({
        ok: false,
        error: "Venta no encontrada",
      });
    }

    if (venta.estado === "cancelada") {
      return res.status(400).json({
        ok: false,
        error: "La venta ya está cancelada",
      });
    }

    const success = await Venta.updateEstado(id, "cancelada");

    if (!success) {
      throw new Error("No se pudo cancelar la venta");
    }

    console.log("✅ [BACKEND] Venta cancelada exitosamente");

    res.json({
      ok: true,
      message: "Venta cancelada exitosamente",
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error en cancelarVenta:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al cancelar la venta",
    });
  }
};

// ✅ AGREGAR FUNCIÓN DE SINCRONIZACIÓN SI FALTA
export const sincronizarVentasOffline = async (req, res) => {
  try {
    const { ventas } = req.body; // Array de ventas creadas offline

    if (!ventas || !Array.isArray(ventas)) {
      return res.status(400).json({
        ok: false,
        error: "Se requiere un array de ventas para sincronizar",
      });
    }

    console.log(
      `🔄 [BACKEND] Sincronizando ${ventas.length} ventas offline...`
    );

    const resultados = {
      exitosas: 0,
      fallidas: 0,
      detalles: [],
    };

    // Procesar cada venta offline
    for (const venta of ventas) {
      try {
        // Crear venta en la base de datos
        const ventaId = await Venta.create(venta);

        if (venta.productos && Array.isArray(venta.productos)) {
          const detallesData = venta.productos.map((producto) => ({
            venta_id: ventaId,
            producto_id: producto.producto_id,
            cantidad: producto.cantidad,
            precio_unitario: producto.precio_unitario,
            subtotal: producto.subtotal,
          }));

          await DetalleVenta.createBatch(detallesData);
        }

        resultados.exitosas++;
        resultados.detalles.push({
          id_local: venta.id_local,
          id_cloud: ventaId,
          status: "success",
        });
      } catch (error) {
        resultados.fallidas++;
        resultados.detalles.push({
          id_local: venta.id_local,
          status: "failed",
          error: error.message,
        });
      }
    }

    res.json({
      ok: true,
      message: "Sincronización completada",
      resultados,
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error en sincronizarVentasOffline:", error);
    res.status(500).json({
      ok: false,
      error: "Error durante la sincronización",
      details: error.message,
    });
  }
};
