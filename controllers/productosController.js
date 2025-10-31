// controllers/productosController.js - SIN TRANSACCIONES
import { Producto } from "../models/Producto.js";
import { Inventario } from "../models/Inventario.js";
import { uploadToImgBB } from "../services/imageService.js";
import { db } from "../database/connection.js";
import bcrypt from "bcrypt";

// controllers/productosController.js - CON MÁS DEBUG
export const obtenerProductos = async (req, res) => {
  try {
    console.log("📥 [BACKEND] GET /api/productos recibida");
    console.log("🔍 [BACKEND] Query parameters:", req.query);

    const { categoria_id, activos = "true" } = req.query;

    const filters = {
      activo: activos === "true",
    };

    if (categoria_id) {
      filters.categoria_id = categoria_id;
    }

    console.log("🎯 [BACKEND] Filtros aplicados:", filters);

    const productos = await Producto.findAll(filters);

    console.log(`📤 [BACKEND] Enviando ${productos.length} productos`);
    console.log("📦 [BACKEND] Productos a enviar:", productos);

    res.json({
      ok: true,
      productos,
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error al obtener productos:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener productos",
    });
  }
};

export const obtenerProductoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await Producto.findById(id);

    if (!producto) {
      return res.status(404).json({
        ok: false,
        error: "Producto no encontrado",
      });
    }

    // ✅ OBTENER DATOS DEL INVENTARIO
    let inventario = null;
    try {
      inventario = await Inventario.findByProductoId(id);
    } catch (inventarioError) {
      console.warn(
        "⚠️ No se pudo obtener datos del inventario:",
        inventarioError
      );
    }

    res.json({
      ok: true,
      producto: {
        ...producto,
        inventario: inventario || {
          stock_actual: producto.stock || 0,
          stock_minimo: producto.stock_minimo || 5,
          ultima_actualizacion: new Date(),
        },
      },
    });
  } catch (error) {
    console.error("Error al obtener producto:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener el producto",
    });
  }
};

// ✅ CREAR PRODUCTO - SIN TRANSACCIONES
export const crearProducto = async (req, res) => {
  try {
    console.log("🚨 ========== INICIO CREAR PRODUCTO ==========");
    console.log("📥 [BACKEND] Body recibido:", req.body);

    const {
      nombre,
      precio,
      precio_compra,
      categoria_id,
      stock,
      descripcion,
      stock_minimo,
      activo, // ✅ VERIFICAR ESTE VALOR
    } = req.body;

    // ✅ DEBUG DETALLADO DEL CAMPO activo
    console.log("🔍 VALOR DE ACTIVO RECIBIDO:");
    console.log("   activo:", activo, `(tipo: ${typeof activo})`);
    console.log("   activo === 'true':", activo === "true");
    console.log("   activo === '1':", activo === "1");
    console.log("   activo === true:", activo === true);
    console.log("   Boolean(activo):", Boolean(activo));

    // ✅ CORREGIR LA LÓGICA DE ACTIVO
    const activoFinal =
      activo === "true" || activo === "1" || activo === true || activo === 1;

    console.log("🎯 ACTIVO FINAL PARA BD:", activoFinal);

    // ✅ VALIDACIONES
    if (!nombre || nombre.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        msg: "El nombre del producto es requerido",
      });
    }

    if (!precio || isNaN(precio) || parseFloat(precio) <= 0) {
      return res.status(400).json({
        ok: false,
        msg: "El precio debe ser un número mayor a 0",
      });
    }

    if (
      !precio_compra ||
      isNaN(precio_compra) ||
      parseFloat(precio_compra) <= 0
    ) {
      return res.status(400).json({
        ok: false,
        msg: "El precio de compra debe ser mayor a 0",
      });
    }

    if (!categoria_id) {
      return res.status(400).json({
        ok: false,
        msg: "La categoría es requerida",
      });
    }

    let imagen_url = null;

    // ✅ PROCESAR IMAGEN
    if (req.file) {
      try {
        console.log("🖼️ Procesando imagen...");
        imagen_url = await uploadToImgBB(req.file.buffer);
        console.log("✅ Imagen procesada:", imagen_url);
      } catch (uploadError) {
        console.error("❌ Error subiendo imagen:", uploadError);
        return res.status(500).json({
          ok: false,
          msg: "Error al procesar la imagen: " + uploadError.message,
        });
      }
    }

    // ✅ PREPARAR DATOS
    const productoData = {
      nombre: nombre.trim(),
      precio: parseFloat(precio),
      precio_compra: parseFloat(precio_compra),
      categoria_id: categoria_id,
      stock: stock ? parseInt(stock) : 0,
      descripcion: descripcion ? descripcion.trim() : "",
      stock_minimo: stock_minimo ? parseInt(stock_minimo) : 5,
      imagen_url,
      activo: activo === "true" || activo === true,
    };

    console.log("📦 DATOS PARA CREAR PRODUCTO:", productoData);

    // ✅ CREAR PRODUCTO
    console.log("💾 Guardando producto en base de datos...");
    const productoId = await Producto.create(productoData);
    console.log("✅ PRODUCTO CREADO CON ID:", productoId);

    // ✅ CREAR INVENTARIO
    console.log("📊 Creando registro en inventario...");
    try {
      await Inventario.create({
        producto_id: productoId,
        stock_actual: productoData.stock,
        stock_minimo: productoData.stock_minimo,
      });
      console.log("✅ REGISTRO DE INVENTARIO CREADO");
    } catch (inventarioError) {
      console.error("❌ Error creando inventario:", inventarioError);
      // No eliminamos el producto, solo continuamos
    }

    // ✅ OBTENER PRODUCTO COMPLETO
    const productoCompleto = await Producto.findById(productoId);
    const inventarioRegistro = await Inventario.findByProductoId(productoId);

    // ✅ RESPUESTA CONSISTENTE - IMPORTANTE: usar la misma estructura que espera el frontend
    const response = {
      ok: true,
      producto: {
        // ✅ Asegurar que sea 'producto' (singular) no 'product'
        ...productoCompleto,
        inventario: inventarioRegistro,
      },
      msg: "Producto creado exitosamente",
    };

    console.log("📤 [BACKEND] Enviando respuesta:", response);
    console.log("🎉 ========== PRODUCTO CREADO EXITOSAMENTE ==========");

    res.json(response);
  } catch (error) {
    console.error("💥 ========== ERROR CRÍTICO ==========");
    console.error("❌ ERROR EN crearProducto:", error);

    // Manejar errores específicos
    if (error.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({
        ok: false,
        msg: "Ya existe un producto con ese código de barras",
      });
    }

    if (error.message.includes("FOREIGN KEY constraint failed")) {
      return res.status(400).json({
        ok: false,
        msg: "La categoría seleccionada no existe",
      });
    }

    res.status(500).json({
      ok: false,
      msg: "Error interno al crear producto: " + error.message,
    });
  }
};

// ✅ ACTUALIZAR PRODUCTO - SIN TRANSACCIONES
export const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔄 [BACKEND] Actualizando producto ID:", id);
    console.log("📥 [BACKEND] Body recibido:", req.body);
    console.log(
      "📁 [BACKEND] File recibido:",
      req.file ? `Sí - ${req.file.originalname}` : "No file"
    );

    const {
      nombre,
      precio,
      precio_compra,
      categoria_id,
      stock,
      descripcion,
      stock_minimo,
      activo,
    } = req.body;

    console.log("🔍 VALORES RECIBIDOS PARA ACTUALIZAR:");
    console.log("   nombre:", nombre);
    console.log("   precio:", precio);
    console.log("   precio_compra:", precio_compra);
    console.log("   categoria_id:", categoria_id);
    console.log("   stock:", stock);
    console.log("   stock_minimo:", stock_minimo);
    console.log("   activo:", activo);

    // ✅ VALIDACIONES RÁPIDAS
    if (!nombre || nombre.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        msg: "El nombre del producto es requerido",
      });
    }

    if (!precio || isNaN(precio) || parseFloat(precio) <= 0) {
      return res.status(400).json({
        ok: false,
        msg: "El precio debe ser un número mayor a 0",
      });
    }

    if (
      !precio_compra ||
      isNaN(precio_compra) ||
      parseFloat(precio_compra) <= 0
    ) {
      return res.status(400).json({
        ok: false,
        msg: "El precio de compra debe ser mayor a 0",
      });
    }

    if (!categoria_id) {
      return res.status(400).json({
        ok: false,
        msg: "La categoría es requerida",
      });
    }

    // ✅ VERIFICAR SI EL PRODUCTO EXISTE
    console.log("🔍 Buscando producto en BD...");
    const producto = await Producto.findById(id);
    if (!producto) {
      console.log("❌ Producto no encontrado en BD");
      return res.status(404).json({
        ok: false,
        msg: "Producto no encontrado",
      });
    }
    console.log("✅ Producto encontrado:", producto.nombre);

    let imagen_url = producto.imagen_url;

    // ✅ SOLO PROCESAR IMAGEN SI HAY ARCHIVO Y ES VÁLIDO
    if (req.file && req.file.buffer && req.file.buffer.length > 0) {
      try {
        console.log("🖼️ Procesando nueva imagen...");
        console.log("   Archivo:", req.file.originalname);
        console.log("   Tamaño:", req.file.size, "bytes");

        if (req.file.size > 5 * 1024 * 1024) {
          return res.status(400).json({
            ok: false,
            msg: "La imagen es demasiado grande. Máximo 5MB permitido.",
          });
        }

        console.log("📤 Subiendo imagen a ImgBB...");
        imagen_url = await uploadToImgBB(req.file.buffer);
        console.log("✅ Nueva imagen subida:", imagen_url ? "Éxito" : "Falló");
      } catch (uploadError) {
        console.error("❌ Error procesando nueva imagen:", uploadError);
        // ✅ NO DEVOLVER ERROR - MANTENER IMAGEN ACTUAL
        console.log("⚠️  Manteniendo imagen actual debido a error");
      }
    } else {
      console.log("📭 No hay archivo de imagen - manteniendo imagen actual");
    }

    // ✅ PREPARAR ACTUALIZACIONES RÁPIDAS
    console.log("📦 Preparando actualizaciones...");
    const updates = {
      nombre: nombre.trim(),
      precio: parseFloat(precio),
      precio_compra: parseFloat(precio_compra),
      categoria_id: categoria_id,
      stock: stock ? parseInt(stock) : producto.stock,
      descripcion: descripcion ? descripcion.trim() : producto.descripcion,
      stock_minimo: stock_minimo
        ? parseInt(stock_minimo)
        : producto.stock_minimo,
      imagen_url: imagen_url,
      activo:
        activo !== undefined
          ? activo === "1" || activo === "true" || activo === true
          : producto.activo,
    };

    console.log("💾 Actualizando producto en base de datos...");
    const result = await Producto.update(id, updates);

    if (!result) {
      return res.status(404).json({
        ok: false,
        msg: "Error al actualizar producto en base de datos",
      });
    }

    // ✅ ACTUALIZAR INVENTARIO
    console.log("📊 Actualizando registro en inventario...");
    try {
      await Inventario.createOrUpdate(id, {
        stock_actual: updates.stock,
        stock_minimo: updates.stock_minimo,
      });
      console.log("✅ INVENTARIO ACTUALIZADO");
    } catch (inventarioError) {
      console.error("❌ Error actualizando inventario:", inventarioError);
      // No devolvemos error, solo log
    }

    console.log("✅ Producto e inventario actualizados exitosamente");

    // ✅ OBTENER DATOS ACTUALIZADOS
    const productoActualizado = await Producto.findById(id);
    const inventarioActualizado = await Inventario.findByProductoId(id);

    res.json({
      ok: true,
      product: {
        ...productoActualizado,
        inventario: inventarioActualizado,
      },
      msg: "Producto e inventario actualizados exitosamente",
    });
  } catch (error) {
    console.error("❌ Error en actualizarProducto:", error);
    res.status(500).json({
      ok: false,
      msg: "Error interno al actualizar producto",
      error: error.message,
    });
  }
};

export const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ ELIMINAR LÓGICAMENTE EL PRODUCTO
    await Producto.delete(id);

    res.json({
      ok: true,
      msg: "Producto eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({
      ok: false,
      msg: "Error interno al eliminar producto",
    });
  }
};

export const buscarProductos = async (req, res) => {
  try {
    const { q, categoria_id } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({
        ok: false,
        msg: "Término de búsqueda requerido",
      });
    }

    const productos = await Producto.buscar(q.trim(), categoria_id);

    res.json({
      ok: true,
      termino: q,
      resultados: productos.length,
      productos,
    });
  } catch (error) {
    console.error("Error al buscar productos:", error);
    res.status(500).json({
      ok: false,
      msg: "Error interno al buscar productos",
    });
  }
};

// ✅ ACTUALIZAR STOCK - SIN TRANSACCIONES
export const actualizarStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock, adminPassword } = req.body;

    console.log("🔄 [BACKEND] Actualizando stock para producto ID:", id);
    console.log("📥 [BACKEND] Datos recibidos:", { stock, adminPassword });

    // ✅ VALIDACIONES BÁSICAS
    if (
      stock === undefined ||
      stock === null ||
      isNaN(stock) ||
      parseInt(stock) < 0
    ) {
      return res.status(400).json({
        ok: false,
        msg: "El stock debe ser un número válido mayor o igual a 0",
      });
    }

    const stockNum = parseInt(stock);

    // ✅ VERIFICAR SI EL PRODUCTO EXISTE
    const producto = await Producto.findById(id);
    if (!producto) {
      return res.status(404).json({
        ok: false,
        msg: "Producto no encontrado",
      });
    }

    // ✅ VERIFICAR PERMISOS SI EL USUARIO NO ES ADMIN
    if (req.uid) {
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
              msg: "Se requiere autorización de administrador para actualizar stock",
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
              msg: "No hay administradores en el sistema para validar esta acción",
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
              msg: "Contraseña de administrador incorrecta",
            });
          }
        }
      } catch (userError) {
        console.error("❌ Error verificando permisos:", userError);
        // Continuar sin verificación de permisos en caso de error
      }
    }

    // ✅ ACTUALIZAR STOCK EN PRODUCTO
    console.log("💾 Actualizando stock en producto...");
    const resultProducto = await Producto.actualizarStock(id, stockNum);

    if (!resultProducto) {
      return res.status(500).json({
        ok: false,
        msg: "Error al actualizar stock en la base de datos",
      });
    }

    // ✅ ACTUALIZAR INVENTARIO
    console.log("📊 Actualizando inventario...");
    try {
      await Inventario.createOrUpdate(id, {
        stock_actual: stockNum,
      });
      console.log("✅ INVENTARIO ACTUALIZADO");
    } catch (inventarioError) {
      console.error("❌ Error actualizando inventario:", inventarioError);
      // No devolvemos error, solo log
    }

    console.log("✅ Stock actualizado exitosamente");

    // ✅ OBTENER DATOS ACTUALIZADOS
    const productoActualizado = await Producto.findById(id);
    const inventarioActualizado = await Inventario.findByProductoId(id);

    res.json({
      ok: true,
      message: "Stock actualizado correctamente",
      product: {
        ...productoActualizado,
        inventario: inventarioActualizado,
      },
    });
  } catch (error) {
    console.error("❌ Error en actualizarStock:", error);
    res.status(500).json({
      ok: false,
      msg: "Error interno al actualizar stock",
      error: error.message,
    });
  }
};
