// controllers/productosController.js - CORREGIDO IGUAL A TU OTRO PROYECTO
import { Producto } from "../models/Producto.js";
import { uploadToImgBB } from "../services/imageService.js";
import { db } from "../database/connection.js"; // ✅ IMPORTAR db
import bcrypt from "bcrypt"; // ✅ IMPORTAR bcrypt

export const obtenerProductos = async (req, res) => {
  try {
    console.log("📥 [BACKEND] GET /api/productos recibida");
    const { categoria_id, activos = "true" } = req.query;

    const filters = {
      activo: activos === "true",
    };

    if (categoria_id) {
      filters.categoria_id = categoria_id;
    }

    const productos = await Producto.findAll(filters);

    console.log(`📤 [BACKEND] Enviando ${productos.length} productos`);
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

    res.json({
      ok: true,
      producto,
    });
  } catch (error) {
    console.error("Error al obtener producto:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener el producto",
    });
  }
};

// ✅ CREAR PRODUCTO - CORREGIDO IGUAL A TU OTRO PROYECTO
export const crearProducto = async (req, res) => {
  try {
    console.log("🚨 ========== INICIO CREAR PRODUCTO ==========");
    console.log("📥 [BACKEND] Body recibido:", req.body);
    console.log(
      "📥 [BACKEND] File recibido:",
      req.file
        ? {
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
          }
        : "No file"
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

    // ✅ LOG DETALLADO DE CADA CAMPO
    console.log("🔍 VALORES RECIBIDOS:");
    console.log("   nombre:", nombre, `(tipo: ${typeof nombre})`);
    console.log("   precio:", precio, `(tipo: ${typeof precio})`);
    console.log(
      "   precio_compra:",
      precio_compra,
      `(tipo: ${typeof precio_compra})`
    );
    console.log(
      "   categoria_id:",
      categoria_id,
      `(tipo: ${typeof categoria_id})`
    );
    console.log("   stock:", stock, `(tipo: ${typeof stock})`);
    console.log(
      "   stock_minimo:",
      stock_minimo,
      `(tipo: ${typeof stock_minimo})`
    );
    console.log("   activo:", activo, `(tipo: ${typeof activo})`);

    // ✅ VALIDACIONES DETALLADAS
    console.log("🔍 INICIANDO VALIDACIONES...");

    if (!nombre || nombre.trim().length === 0) {
      console.log("❌ VALIDACIÓN FALLIDA: nombre faltante o vacío");
      return res.status(400).json({
        ok: false,
        msg: "El nombre del producto es requerido",
      });
    }

    if (!precio) {
      console.log("❌ VALIDACIÓN FALLIDA: precio faltante");
      return res.status(400).json({
        ok: false,
        msg: "El precio debe ser un número mayor a 0",
      });
    }

    const precioNum = parseFloat(precio);
    console.log("💰 Precio parseado:", precioNum);

    if (isNaN(precioNum) || precioNum <= 0) {
      console.log("❌ VALIDACIÓN FALLIDA: precio inválido");
      return res.status(400).json({
        ok: false,
        msg: "El precio debe ser un número mayor a 0",
      });
    }

    if (!precio_compra) {
      console.log("❌ VALIDACIÓN FALLIDA: precio_compra faltante");
      return res.status(400).json({
        ok: false,
        msg: "El precio de compra debe ser mayor a 0",
      });
    }

    const precioCompraNum = parseFloat(precio_compra);
    console.log("💰 Precio compra parseado:", precioCompraNum);

    if (isNaN(precioCompraNum) || precioCompraNum <= 0) {
      console.log("❌ VALIDACIÓN FALLIDA: precio_compra inválido");
      return res.status(400).json({
        ok: false,
        msg: "El precio de compra debe ser un número mayor a 0",
      });
    }

    if (!categoria_id) {
      console.log("❌ VALIDACIÓN FALLIDA: categoria_id faltante");
      return res.status(400).json({
        ok: false,
        msg: "La categoría es requerida",
      });
    }

    console.log("✅ TODAS LAS VALIDACIONES PASARON");

    let imagen_url = null;

    // ✅ PROCESAR IMAGEN
    if (req.file) {
      try {
        console.log("🖼️ Procesando imagen...");
        console.log("   Archivo:", req.file.originalname);
        console.log("   Tamaño:", req.file.size, "bytes");

        imagen_url = await uploadToImgBB(req.file.buffer);
        console.log("✅ Imagen procesada:", imagen_url);
      } catch (uploadError) {
        console.error("❌ Error subiendo imagen:", uploadError);
        return res.status(500).json({
          ok: false,
          msg: "Error al procesar la imagen: " + uploadError.message,
        });
      }
    } else {
      console.log("📭 No hay archivo de imagen");
    }

    // ✅ PREPARAR DATOS PARA LA BD
    const productoData = {
      nombre: nombre.trim(),
      precio: precioNum,
      precio_compra: precioCompraNum,
      categoria_id: categoria_id,
      stock: stock ? parseInt(stock) : 0,
      descripcion: descripcion ? descripcion.trim() : "",
      stock_minimo: stock_minimo ? parseInt(stock_minimo) : 5,
      imagen_url,
      activo: activo === "true" || activo === true,
    };

    console.log("📦 DATOS PARA CREAR PRODUCTO:", productoData);

    // ✅ CREAR PRODUCTO EN BD
    console.log("💾 Guardando en base de datos...");
    const id = await Producto.create(productoData);
    console.log("✅ PRODUCTO CREADO CON ID:", id);

    res.json({
      ok: true,
      product: {
        id,
        ...productoData,
      },
      msg: "Producto creado exitosamente",
    });

    console.log("🎉 ========== PRODUCTO CREADO EXITOSAMENTE ==========");
  } catch (error) {
    console.error("💥 ========== ERROR CRÍTICO ==========");
    console.error("❌ ERROR EN crearProducto:", error);
    console.error("📋 Stack trace:", error.stack);

    // Manejar errores específicos
    if (error.message.includes("UNIQUE constraint failed")) {
      console.log("🔑 ERROR: Violación de constraint UNIQUE");
      return res.status(400).json({
        ok: false,
        msg: "Ya existe un producto con ese código de barras",
      });
    }

    if (error.message.includes("FOREIGN KEY constraint failed")) {
      console.log("🔗 ERROR: Violación de FOREIGN KEY");
      return res.status(400).json({
        ok: false,
        msg: "La categoría seleccionada no existe",
      });
    }

    console.log("❌ ERROR GENÉRICO");
    res.status(500).json({
      ok: false,
      msg: "Error interno al crear producto: " + error.message,
    });
  }
};

// ✅ ACTUALIZAR PRODUCTO - CORREGIDO IGUAL A TU OTRO PROYECTO
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

    console.log("💾 Guardando en base de datos...");
    const result = await Producto.update(id, updates);

    if (!result) {
      return res.status(404).json({
        ok: false,
        msg: "Error al actualizar producto en base de datos",
      });
    }

    console.log("✅ Producto actualizado exitosamente");

    res.json({
      ok: true,
      product: {
        id: id,
        ...updates,
      },
      msg: "Producto actualizado exitosamente",
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
        // ✅ CORREGIR LA CONSULTA - usar db.query en lugar de db.execute
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

    // ✅ ACTUALIZAR STOCK EN LA BASE DE DATOS
    console.log("💾 Actualizando stock en BD...");
    const result = await Producto.actualizarStock(id, stockNum);

    if (!result) {
      return res.status(500).json({
        ok: false,
        msg: "Error al actualizar stock en la base de datos",
      });
    }

    console.log("✅ Stock actualizado exitosamente");

    // ✅ OBTENER EL PRODUCTO ACTUALIZADO
    const productoActualizado = await Producto.findById(id);

    res.json({
      ok: true,
      message: "Stock actualizado correctamente",
      product: productoActualizado,
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
