// createAdminUser.js
import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

// Cargar variables de entorno
dotenv.config();

// Crear cliente de Turso directamente
const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/**
 * Script para crear usuario administrador
 */
const createAdminUser = async () => {
  try {
    console.log("🚀 Iniciando creación de usuario administrador...");
    console.log("📡 Conectando a Turso...");

    // Verificar conexión ejecutando una consulta simple
    try {
      const result = await db.execute("SELECT 1 as test");
      console.log("✅ Conexión a Turso establecida");
    } catch (connectionError) {
      console.error("💥 Error conectando a Turso:", connectionError.message);
      throw new Error("No se pudo conectar a la base de datos");
    }

    // Crear tabla de usuarios si no existe
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nombre TEXT NOT NULL,
        rol TEXT CHECK(rol IN ('admin', 'vendedor', 'cajero')) DEFAULT 'vendedor',
        activo BOOLEAN DEFAULT true,
        ultimo_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db.execute(createTableSQL);
    console.log("✅ Tabla de usuarios verificada/creada");

    // Encriptar contraseña
    const plainPassword = "admin123456";
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(plainPassword, saltRounds);

    // Datos del usuario administrador
    const userId = `admin-${Date.now()}`;
    const userData = {
      id: userId,
      username: "admin",
      email: "admin@kioskoflow.com",
      password_hash: password_hash,
      nombre: "Administrador Principal",
      rol: "admin",
      activo: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Verificar si el usuario ya existe
    const existingUser = await db.execute({
      sql: "SELECT * FROM users WHERE username = ?",
      args: ["admin"],
    });

    if (existingUser.rows.length > 0) {
      console.log(
        "⚠️  El usuario administrador ya existe. Actualizando contraseña..."
      );

      await db.execute({
        sql: "UPDATE users SET password_hash = ?, updated_at = ? WHERE username = ?",
        args: [password_hash, new Date().toISOString(), "admin"],
      });

      console.log("✅ Contraseña del administrador actualizada");
    } else {
      // Insertar nuevo usuario
      await db.execute({
        sql: `INSERT INTO users (id, username, email, password_hash, nombre, rol, activo, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          userData.id,
          userData.username,
          userData.email,
          userData.password_hash,
          userData.nombre,
          userData.rol,
          userData.activo,
          userData.created_at,
          userData.updated_at,
        ],
      });

      console.log("✅ Usuario administrador creado exitosamente");
    }

    // Mostrar usuarios existentes
    const usersResult = await db.execute(`
      SELECT id, username, email, nombre, rol, activo, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);

    console.log("\n📋 Usuarios en el sistema:");
    if (usersResult.rows.length > 0) {
      const usersTable = usersResult.rows.map((user) => ({
        ID: user.id,
        Usuario: user.username,
        Email: user.email,
        Nombre: user.nombre,
        Rol: user.rol,
        Activo: user.activo ? "✅" : "❌",
        Creado: new Date(user.created_at).toLocaleDateString(),
      }));
      console.table(usersTable);
    } else {
      console.log("   No hay usuarios registrados");
    }

    console.log("\n🔐 Credenciales de acceso:");
    console.log("📧 Usuario: admin");
    console.log("🔑 Contraseña: admin123456");
    console.log("🌐 URL Login: http://localhost:3000/api/auth/login");

    // Verificar que el login funciona
    console.log("\n🧪 Verificando credenciales...");
    const testUser = await db.execute({
      sql: "SELECT username, password_hash FROM users WHERE username = ?",
      args: ["admin"],
    });

    if (testUser.rows.length > 0) {
      const storedHash = testUser.rows[0].password_hash;
      const passwordMatch = await bcrypt.compare("admin123456", storedHash);

      if (passwordMatch) {
        console.log("✅ Contraseña verificada correctamente");
        console.log("🎉 Usuario admin listo para usar!");
      } else {
        console.log("❌ Error: La contraseña no coincide");
      }
    }
  } catch (error) {
    console.error("💥 Error creando usuario administrador:", error.message);
    console.error("Detalles:", error);
  } finally {
    // Cerrar conexión
    db.close();
    console.log("\n🔒 Conexión a la base de datos cerrada");
  }
};

// Ejecutar el script
createAdminUser();
