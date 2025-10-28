// controllers/authController.js
import bcrypt from "bcryptjs";
import { generarJWT } from "../helpers/jwt.js";
import { db } from "../database/connection.js";

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validación básica
    if (!username || !password) {
      return res.status(400).json({
        ok: false,
        error: "Usuario y contraseña son requeridos",
      });
    }

    console.log("🔍 Buscando usuario:", username);

    // Buscar usuario en la base de datos - FORMA CORRECTA para Turso
    const result = await db.execute(
      "SELECT * FROM users WHERE username = ? AND activo = true",
      [username]
    );

    console.log(
      "📊 Resultado de búsqueda:",
      result.rows.length,
      "usuarios encontrados"
    );

    if (result.rows.length === 0) {
      console.log("❌ Usuario no encontrado:", username);
      return res.status(400).json({
        ok: false,
        error: "Credenciales incorrectas",
      });
    }

    const usuario = result.rows[0];
    console.log("✅ Usuario encontrado:", usuario.username);

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, usuario.password_hash);
    console.log(
      "🔐 Verificación de contraseña:",
      validPassword ? "✅ Correcta" : "❌ Incorrecta"
    );

    if (!validPassword) {
      return res.status(400).json({
        ok: false,
        error: "Credenciales incorrectas",
      });
    }

    // Actualizar último login
    await db.execute("UPDATE users SET ultimo_login = ? WHERE id = ?", [
      new Date().toISOString(),
      usuario.id,
    ]);

    console.log("🔄 Último login actualizado");

    // Generar JWT
    const token = await generarJWT(usuario.id, usuario.nombre);
    console.log("🔑 JWT generado");

    res.json({
      ok: true,
      message: "Login exitoso",
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        rol: usuario.rol,
        email: usuario.email,
      },
      token,
    });

    console.log("🎉 Login completado exitosamente");
  } catch (error) {
    console.error("💥 Error en login:", error);
    console.error("📋 Detalles del error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    res.status(500).json({
      ok: false,
      error: "Error interno del servidor en login",
    });
  }
};

export const renovarToken = async (req, res) => {
  try {
    const { uid, name } = req;

    console.log("🔄 Renovando token para usuario:", uid);

    // Verificar que el usuario aún existe y está activo
    const result = await db.execute(
      "SELECT * FROM users WHERE id = ? AND activo = true",
      [uid]
    );

    if (result.rows.length === 0) {
      console.log("❌ Usuario no encontrado para renovación:", uid);
      return res.status(401).json({
        ok: false,
        error: "Usuario no encontrado o inactivo",
      });
    }

    const usuario = result.rows[0];
    const token = await generarJWT(usuario.id, usuario.nombre);

    console.log("✅ Token renovado para:", usuario.username);

    res.json({
      ok: true,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        rol: usuario.rol,
        email: usuario.email,
      },
      token,
    });
  } catch (error) {
    console.error("💥 Error renovando token:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno renovando token",
    });
  }
};

export const crearUsuario = async (req, res) => {
  try {
    const { username, email, password, nombre, rol = "vendedor" } = req.body;

    // Validación básica
    if (!username || !email || !password || !nombre) {
      return res.status(400).json({
        ok: false,
        error: "Todos los campos son requeridos",
      });
    }

    console.log("👤 Creando usuario:", username);

    // Verificar si el usuario ya existe
    const existingUser = await db.execute(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      console.log("❌ Usuario o email ya existe:", username, email);
      return res.status(400).json({
        ok: false,
        error: "El usuario o email ya existe",
      });
    }

    // Encriptar contraseña
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    console.log("🔐 Contraseña encriptada");

    // Crear usuario
    const userId = `user-${Date.now()}`;
    await db.execute(
      `INSERT INTO users (id, username, email, password_hash, nombre, rol) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, username, email, password_hash, nombre, rol]
    );

    console.log("✅ Usuario creado en BD:", userId);

    // Generar JWT
    const token = await generarJWT(userId, nombre);

    res.status(201).json({
      ok: true,
      message: "Usuario creado exitosamente",
      usuario: {
        id: userId,
        username,
        nombre,
        rol,
        email,
      },
      token,
    });
  } catch (error) {
    console.error("💥 Error creando usuario:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno del servidor creando usuario",
    });
  }
};
