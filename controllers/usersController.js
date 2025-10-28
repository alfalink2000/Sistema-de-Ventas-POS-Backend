// controllers/usersController.js
import bcrypt from "bcryptjs";
import { db } from "../database/connection.js";

export const obtenerUsuarios = async (req, res) => {
  try {
    console.log("📥 [BACKEND] GET /api/users recibida");

    const result = await db.execute(
      "SELECT id, username, email, nombre, rol, activo, ultimo_login, created_at FROM users WHERE activo = true ORDER BY nombre"
    );

    console.log(`📤 [BACKEND] Enviando ${result.rows.length} usuarios`);

    res.json({
      ok: true,
      usuarios: result.rows,
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error al obtener usuarios:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener usuarios",
    });
  }
};

export const obtenerUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.execute(
      "SELECT id, username, email, nombre, rol, activo, ultimo_login, created_at FROM users WHERE id = ? AND activo = true",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Usuario no encontrado",
      });
    }

    res.json({
      ok: true,
      usuario: result.rows[0],
    });
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener el usuario",
    });
  }
};

export const crearUsuario = async (req, res) => {
  try {
    console.log("🚨 ========== INICIO CREAR USUARIO ==========");
    console.log("📥 [BACKEND] Body recibido:", req.body);

    const { username, email, password, nombre, rol = "vendedor" } = req.body;

    // ✅ VALIDACIONES
    console.log("🔍 INICIANDO VALIDACIONES...");

    if (!username || username.trim().length === 0) {
      console.log("❌ VALIDACIÓN FALLIDA: username faltante");
      return res.status(400).json({
        ok: false,
        msg: "El nombre de usuario es requerido",
      });
    }

    if (!email || email.trim().length === 0) {
      console.log("❌ VALIDACIÓN FALLIDA: email faltante");
      return res.status(400).json({
        ok: false,
        msg: "El email es requerido",
      });
    }

    if (!password || password.length < 6) {
      console.log("❌ VALIDACIÓN FALLIDA: password inválido");
      return res.status(400).json({
        ok: false,
        msg: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    if (!nombre || nombre.trim().length === 0) {
      console.log("❌ VALIDACIÓN FALLIDA: nombre faltante");
      return res.status(400).json({
        ok: false,
        msg: "El nombre completo es requerido",
      });
    }

    // ✅ VERIFICAR SI EL USUARIO O EMAIL YA EXISTEN
    console.log("🔍 Verificando usuario/email existentes...");
    const existingUser = await db.execute(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username.trim(), email.trim()]
    );

    if (existingUser.rows.length > 0) {
      console.log("❌ Usuario o email ya existe");
      return res.status(400).json({
        ok: false,
        msg: "El nombre de usuario o email ya está en uso",
      });
    }

    console.log("✅ TODAS LAS VALIDACIONES PASARON");

    // ✅ ENCRIPTAR CONTRASEÑA
    console.log("🔐 Encriptando contraseña...");
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // ✅ CREAR USUARIO EN BD
    const userId = `user_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    console.log("💾 Guardando usuario en BD...");
    await db.execute(
      `INSERT INTO users (id, username, email, password_hash, nombre, rol, activo) 
       VALUES (?, ?, ?, ?, ?, ?, true)`,
      [userId, username.trim(), email.trim(), password_hash, nombre.trim(), rol]
    );

    console.log("✅ USUARIO CREADO CON ID:", userId);

    // ✅ OBTENER USUARIO CREADO (SIN PASSWORD)
    const userResult = await db.execute(
      "SELECT id, username, email, nombre, rol, activo, created_at FROM users WHERE id = ?",
      [userId]
    );

    const usuarioCreado = userResult.rows[0];

    res.status(201).json({
      ok: true,
      usuario: usuarioCreado,
      msg: "Usuario creado exitosamente",
    });

    console.log("🎉 ========== USUARIO CREADO EXITOSAMENTE ==========");
  } catch (error) {
    console.error("💥 ========== ERROR CRÍTICO ==========");
    console.error("❌ ERROR EN crearUsuario:", error);
    console.error("📋 Stack trace:", error.stack);

    res.status(500).json({
      ok: false,
      msg: "Error interno al crear usuario: " + error.message,
    });
  }
};

// controllers/usersController.js - ACTUALIZAR actualizarUsuario
export const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔄 [BACKEND] Actualizando usuario ID:", id);
    console.log("📥 [BACKEND] Body recibido:", req.body);

    const {
      username,
      email,
      nombre,
      rol,
      currentPassword,
      newPassword,
      adminPassword,
    } = req.body;

    // ✅ VALIDACIONES BÁSICAS
    if (!username || username.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        msg: "El nombre de usuario es requerido",
      });
    }

    if (!email || email.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        msg: "El email es requerido",
      });
    }

    if (!nombre || nombre.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        msg: "El nombre completo es requerido",
      });
    }

    // ✅ VERIFICAR SI EL USUARIO EXISTE
    const usuarioExistente = await db.execute(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );

    if (usuarioExistente.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado",
      });
    }

    const usuario = usuarioExistente.rows[0];

    // ✅ VERIFICAR SI EL USERNAME O EMAIL YA ESTÁN EN USO (por otros usuarios)
    const existingUser = await db.execute(
      "SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?",
      [username.trim(), email.trim(), id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        ok: false,
        msg: "El nombre de usuario o email ya está en uso por otro usuario",
      });
    }

    // ✅ VALIDACIÓN PARA CAMBIO A ROL ADMIN
    if (rol === "admin" && usuario.rol !== "admin") {
      console.log("🔐 Validando cambio a rol administrador...");

      if (!adminPassword) {
        return res.status(400).json({
          ok: false,
          msg: "Se requiere contraseña de administrador para asignar este rol",
        });
      }

      // Verificar contraseña de administrador
      const adminUser = await db.execute(
        "SELECT * FROM users WHERE rol = 'admin' AND activo = true LIMIT 1"
      );

      if (adminUser.rows.length === 0) {
        return res.status(400).json({
          ok: false,
          msg: "No hay administradores en el sistema para validar esta acción",
        });
      }

      const validAdminPassword = await bcrypt.compare(
        adminPassword,
        adminUser.rows[0].password_hash
      );

      if (!validAdminPassword) {
        return res.status(400).json({
          ok: false,
          msg: "Contraseña de administrador incorrecta",
        });
      }
    }

    // ✅ VALIDACIÓN PARA CAMBIO DE CONTRASEÑA
    let password_hash = usuario.password_hash;

    if (currentPassword && newPassword) {
      console.log("🔐 Procesando cambio de contraseña...");

      // Verificar contraseña actual
      const validCurrentPassword = await bcrypt.compare(
        currentPassword,
        usuario.password_hash
      );

      if (!validCurrentPassword) {
        return res.status(400).json({
          ok: false,
          msg: "La contraseña actual es incorrecta",
        });
      }

      // Validar nueva contraseña
      if (newPassword.length < 6) {
        return res.status(400).json({
          ok: false,
          msg: "La nueva contraseña debe tener al menos 6 caracteres",
        });
      }

      // Encriptar nueva contraseña
      const saltRounds = 10;
      password_hash = await bcrypt.hash(newPassword, saltRounds);
      console.log("✅ Nueva contraseña encriptada");
    }

    // ✅ PREPARAR ACTUALIZACIONES
    const updates = {
      username: username.trim(),
      email: email.trim(),
      nombre: nombre.trim(),
      rol: rol || usuario.rol,
      password_hash: password_hash, // Mantener o actualizar la contraseña
    };

    console.log("📦 Datos para actualizar:", {
      username: updates.username,
      email: updates.email,
      nombre: updates.nombre,
      rol: updates.rol,
      password_updated: currentPassword ? "Sí" : "No",
    });

    // ✅ CONSTRUIR QUERY DINÁMICO
    const fields = [];
    const values = [];

    Object.keys(updates).forEach((key) => {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    });

    values.push(id);

    const sql = `UPDATE users SET ${fields.join(
      ", "
    )}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    console.log("💾 Ejecutando actualización en BD...");
    await db.execute(sql, values);

    // ✅ OBTENER USUARIO ACTUALIZADO (SIN PASSWORD)
    const userResult = await db.execute(
      "SELECT id, username, email, nombre, rol, activo, ultimo_login, created_at FROM users WHERE id = ?",
      [id]
    );

    const usuarioActualizado = userResult.rows[0];

    console.log("✅ Usuario actualizado exitosamente");

    res.json({
      ok: true,
      usuario: usuarioActualizado,
      msg: currentPassword
        ? "Usuario y contraseña actualizados exitosamente"
        : "Usuario actualizado exitosamente",
    });
  } catch (error) {
    console.error("❌ Error en actualizarUsuario:", error);
    res.status(500).json({
      ok: false,
      msg: "Error interno al actualizar usuario",
      error: error.message,
    });
  }
};

export const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🗑️ [BACKEND] Eliminando usuario ID:", id);

    // ✅ VERIFICAR SI EL USUARIO EXISTE
    const usuarioExistente = await db.execute(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );

    if (usuarioExistente.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado",
      });
    }

    // ✅ ELIMINACIÓN LÓGICA (NO FÍSICA)
    await db.execute(
      "UPDATE users SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );

    console.log("✅ Usuario eliminado (desactivado) exitosamente");

    res.json({
      ok: true,
      msg: "Usuario eliminado exitosamente",
    });
  } catch (error) {
    console.error("❌ Error al eliminar usuario:", error);
    res.status(500).json({
      ok: false,
      msg: "Error interno al eliminar usuario",
    });
  }
};
