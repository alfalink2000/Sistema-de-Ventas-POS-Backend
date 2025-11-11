// controllers/ventasController.js - VERSIÓN SIN INVENTARIO
import { Venta } from "../models/Venta.js";
import { DetalleVenta } from "../models/DetalleVenta.js";
import { db } from "../database/connection.js";

// ✅ FUNCIÓN PARA ACTUALIZAR STOCK DE PRODUCTOS (SOLO EN PRODUCTOS)
const actualizarStockProductos = async (productos) => {
  try {
    console.log("🔄 [STOCK BACKEND] Actualizando stock desde VENTA...");

    for (const producto of productos) {
      try {
        const productoId = producto.producto_id.toString();
        const cantidadVendida = parseInt(producto.cantidad);

        console.log(
          `📦 Actualizando stock por venta: ${productoId} -${cantidadVendida}`
        );

        // 1. Obtener producto actual
        const productQuery = `SELECT id, nombre, stock FROM productos WHERE id = ?`;
        const productResult = await db.execute(productQuery, [productoId]);

        if (productResult.rows.length === 0) {
          throw new Error(`Producto con ID ${productoId} no encontrado`);
        }

        const productoActual = productResult.rows[0];
        const stockActual = parseInt(productoActual.stock) || 0;
        const nuevoStock = Math.max(0, stockActual - cantidadVendida);

        console.log(
          `📊 Stock cálculo: ${stockActual} - ${cantidadVendida} = ${nuevoStock}`
        );

        // 2. Actualizar stock en tabla productos
        const updateProductQuery = `UPDATE productos SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        await db.execute(updateProductQuery, [nuevoStock, productoId]);

        console.log(
          `✅ Stock actualizado por venta: ${productoActual.nombre} -> ${nuevoStock}`
        );
      } catch (error) {
        console.error(
          `❌ Error actualizando stock de ${producto.producto_id}:`,
          error
        );
        throw error;
      }
    }

    console.log("✅ [STOCK BACKEND] Todos los stocks actualizados desde venta");
    return true;
  } catch (error) {
    console.error(
      "❌ [STOCK BACKEND] Error general actualizando stock desde venta:",
      error
    );
    throw error;
  }
};

// ✅ FUNCIÓN PARA REVERTIR STOCK EN CASO DE ERROR
const revertirStockProductos = async (productos) => {
  try {
    console.log("🔄 [STOCK BACKEND] Revirtiendo stock debido a error...");

    for (const producto of productos) {
      try {
        const productoId = producto.producto_id.toString();
        const cantidadVendida = parseInt(producto.cantidad);

        // Obtener producto actual
        const productQuery = `SELECT id, nombre, stock FROM productos WHERE id = ?`;
        const productResult = await db.execute(productQuery, [productoId]);

        if (productResult.rows.length === 0) {
          console.error(
            `❌ Producto no encontrado para revertir: ${productoId}`
          );
          continue;
        }

        const productoActual = productResult.rows[0];
        const stockActual = parseInt(productoActual.stock) || 0;
        const nuevoStock = stockActual + cantidadVendida; // Revertir sumando

        console.log(
          `📊 Stock revertido: ${stockActual} + ${cantidadVendida} = ${nuevoStock}`
        );

        // Actualizar stock
        const updateProductQuery = `UPDATE productos SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        await db.execute(updateProductQuery, [nuevoStock, productoId]);

        console.log(
          `✅ Stock revertido: ${productoActual.nombre} -> ${nuevoStock}`
        );
      } catch (error) {
        console.error(
          `❌ Error revirtiendo stock de ${producto.producto_id}:`,
          error
        );
      }
    }

    console.log("✅ [STOCK BACKEND] Stock revertido completamente");
  } catch (error) {
    console.error("❌ [STOCK BACKEND] Error general revirtiendo stock:", error);
  }
};

// ✅ FUNCIÓN PRINCIPAL CREAR VENTA - SIN INVENTARIO
export const crearVenta = async (req, res) => {
  let ventaId = null;

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
      es_offline = false,
      id_local = null,
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

    // ✅ VERIFICAR QUE LOS PRODUCTOS EXISTEN EN LA BD Y TIENEN STOCK
    try {
      for (const producto of productos) {
        const productQuery = `SELECT id, nombre, precio, stock FROM productos WHERE id = ?`;
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
          // ✅ VERIFICAR STOCK DISPONIBLE
          const productoBD = productResult.rows[0];
          const stockDisponible = parseInt(productoBD.stock) || 0;
          const cantidadRequerida = parseInt(producto.cantidad) || 0;

          if (stockDisponible < cantidadRequerida) {
            return res.status(400).json({
              ok: false,
              error: `Stock insuficiente para ${productoBD.nombre}: ${stockDisponible} disponible, ${cantidadRequerida} requerido`,
            });
          }

          console.log(
            `✅ [BACKEND] Producto verificado: ${productoBD.nombre}, Stock: ${stockDisponible}`
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
      es_offline: es_offline,
      id_local: id_local,
    };

    console.log("🔄 [BACKEND] Creando venta con datos:", ventaData);

    try {
      // ✅ PRIMERO: ACTUALIZAR STOCK DE PRODUCTOS
      console.log("🔄 [BACKEND] Actualizando stock de productos...");
      await actualizarStockProductos(productos);
      console.log("✅ [BACKEND] Stock de productos actualizado");

      // 1. Crear la venta
      ventaId = await Venta.create(ventaData);

      if (!ventaId) {
        throw new Error("Error al crear la venta - no se obtuvo ID");
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
        producto_nombre: producto.nombre || producto.producto_nombre,
      }));

      console.log("🔄 [BACKEND] Creando detalles de venta:", detallesData);

      await DetalleVenta.createBatch(detallesData);
      console.log("✅ [BACKEND] Detalles de venta creados exitosamente");
    } catch (error) {
      console.error("❌ [BACKEND] Error durante la creación:", error);

      // ✅ REVERTIR STOCK SI HUBO ERROR DESPUÉS DE ACTUALIZAR STOCK
      if (ventaId) {
        console.log("🔄 [BACKEND] Revertiendo stock debido a error...");
        await revertirStockProductos(productos);

        // Eliminar la venta creada
        await Venta.deleteById(ventaId);
        console.log("🗑️ [BACKEND] Venta eliminada debido a error");
      }

      return res.status(500).json({
        ok: false,
        error: "Error al procesar la venta: " + error.message,
        details: error.stack,
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
      // ✅ INCLUIR REFERENCIA LOCAL SI EXISTE
      ...(id_local && { id_local }),
    };

    console.log("✅ [BACKEND] Venta completada exitosamente:", {
      ventaId,
      total: ventaData.total,
      productos: productos.length,
      sesion: ventaData.sesion_caja_id,
    });

    res.status(201).json({
      ok: true,
      message: "Venta creada exitosamente",
      venta: respuesta,
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error en crearVenta:", error);

    // ✅ REVERTIR STOCK EN CASO DE ERROR GENERAL
    if (ventaId && productos) {
      console.log("🔄 [BACKEND] Revertiendo stock por error general...");
      await revertirStockProductos(productos);
    }

    res.status(500).json({
      ok: false,
      error: "Error interno al procesar la venta",
      details: error.message,
    });
  }
};

// ✅ CANCELAR VENTA - SIN INVENTARIO
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

    // ✅ OBTENER DETALLES DE LA VENTA PARA REVERTIR STOCK
    const detalles = await DetalleVenta.findByVentaId(id);

    if (detalles.rows && detalles.rows.length > 0) {
      console.log("🔄 [BACKEND] Revertiendo stock por cancelación...");

      // Revertir stock de cada producto
      for (const detalle of detalles.rows) {
        const productQuery = `SELECT id, nombre, stock FROM productos WHERE id = ?`;
        const productResult = await db.execute(productQuery, [
          detalle.producto_id,
        ]);

        if (productResult.rows.length > 0) {
          const producto = productResult.rows[0];
          const stockActual = parseInt(producto.stock) || 0;
          const nuevoStock = stockActual + parseInt(detalle.cantidad);

          const updateQuery = `UPDATE productos SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
          await db.execute(updateQuery, [nuevoStock, detalle.producto_id]);

          console.log(
            `✅ Stock revertido: ${producto.nombre} +${detalle.cantidad} = ${nuevoStock}`
          );
        }
      }
    }

    // Actualizar estado de la venta
    const success = await Venta.updateEstado(id, "cancelada");

    if (!success) {
      throw new Error("No se pudo cancelar la venta");
    }

    console.log("✅ [BACKEND] Venta cancelada exitosamente");

    res.json({
      ok: true,
      message: "Venta cancelada exitosamente",
      venta: {
        ...venta,
        estado: "cancelada",
        motivo_cancelacion: motivo,
      },
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error en cancelarVenta:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al cancelar la venta",
    });
  }
};

// ... (las otras funciones de ventas permanecen iguales)
export const obtenerVentas = async (req, res) => {
  try {
    console.log("📥 [BACKEND] GET /api/ventas recibida");
    const { limite = 50, pagina = 1, sesion_id } = req.query;

    let ventas;
    if (sesion_id) {
      ventas = await Venta.findBySesionCaja(sesion_id);
    } else {
      ventas = await Venta.findAll({
        limite: parseInt(limite),
        pagina: parseInt(pagina),
      });
    }

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
    const { fecha_inicio, fecha_fin, sesion_id } = req.query;

    console.log(
      `📊 [BACKEND] Obteniendo estadísticas desde ${fecha_inicio} hasta ${fecha_fin}`
    );

    let ventas = await Venta.findAll();

    // Filtrar por sesión si se proporciona
    if (sesion_id) {
      ventas = ventas.filter((venta) => venta.sesion_caja_id == sesion_id);
    }

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
        console.log(`🔄 Procesando venta offline: ${venta.id_local}`);

        // Crear venta en la base de datos
        const ventaId = await Venta.create({
          ...venta,
          es_offline: true,
          id_local: venta.id_local,
        });

        if (venta.productos && Array.isArray(venta.productos)) {
          const detallesData = venta.productos.map((producto) => ({
            venta_id: ventaId,
            producto_id: producto.producto_id,
            cantidad: producto.cantidad,
            precio_unitario: producto.precio_unitario,
            subtotal: producto.subtotal,
            producto_nombre: producto.nombre,
          }));

          await DetalleVenta.createBatch(detallesData);
        }

        resultados.exitosas++;
        resultados.detalles.push({
          id_local: venta.id_local,
          id_cloud: ventaId,
          status: "success",
        });

        console.log(
          `✅ Venta offline sincronizada: ${venta.id_local} -> ${ventaId}`
        );
      } catch (error) {
        resultados.fallidas++;
        resultados.detalles.push({
          id_local: venta.id_local,
          status: "failed",
          error: error.message,
        });
        console.error(`❌ Error sincronizando venta ${venta.id_local}:`, error);
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

export const obtenerGananciasSesion = async (req, res) => {
  try {
    const { sesionId } = req.params;
    console.log(`💰 [BACKEND] Obteniendo ganancias para sesión: ${sesionId}`);

    const ventas = await Venta.findBySesionCaja(sesionId);

    let totalVentas = 0;
    let gananciaBruta = 0;
    let cantidadVentas = 0;

    for (const venta of ventas) {
      if (venta.estado !== "cancelada") {
        totalVentas += parseFloat(venta.total) || 0;
        cantidadVentas++;

        // Calcular ganancia basada en detalles si están disponibles
        if (venta.productos && Array.isArray(venta.productos)) {
          const gananciaVenta = venta.productos.reduce((sum, producto) => {
            const precioVenta = parseFloat(producto.precio_unitario) || 0;
            const cantidad = parseInt(producto.cantidad) || 0;
            const costo = precioVenta * 0.8; // 20% de ganancia estimada
            return sum + (precioVenta - costo) * cantidad;
          }, 0);
          gananciaBruta += gananciaVenta;
        } else {
          // Estimación si no hay detalles
          gananciaBruta += (parseFloat(venta.total) || 0) * 0.25; // 25% de margen
        }
      }
    }

    res.json({
      ok: true,
      ganancias: {
        total_ventas: Math.round(totalVentas * 100) / 100,
        ganancia_bruta: Math.round(gananciaBruta * 100) / 100,
        cantidad_ventas: cantidadVentas,
        sesion_id: sesionId,
      },
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error en obtenerGananciasSesion:", error);
    res.status(500).json({
      ok: false,
      error: "Error al calcular ganancias",
    });
  }
};
