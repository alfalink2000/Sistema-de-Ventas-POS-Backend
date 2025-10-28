// routes/init.js
import { Router } from "express";
import { db } from "../database/connection.js";

const router = Router();

router.post("/init-database", async (req, res) => {
  try {
    console.log("🔄 Inicializando base de datos...");

    // Script de eliminación
    const dropQueries = [
      "DROP TABLE IF EXISTS detalles_venta",
      "DROP TABLE IF EXISTS ventas",
      "DROP TABLE IF EXISTS cierres_caja",
      "DROP TABLE IF EXISTS sesiones_caja",
      "DROP TABLE IF EXISTS inventario",
      "DROP TABLE IF EXISTS productos",
      "DROP TABLE IF EXISTS categorias",
      "DROP TABLE IF EXISTS users",
    ];

    for (const query of dropQueries) {
      await db.execute(query);
    }
    console.log("✅ Tablas eliminadas");

    // Script de creación
    const createSchema = `
      -- Tabla de usuarios
      CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          nombre TEXT NOT NULL,
          rol TEXT DEFAULT 'vendedor' CHECK (rol IN ('admin', 'vendedor', 'cajero')),
          activo BOOLEAN DEFAULT true,
          ultimo_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla de categorias
      CREATE TABLE IF NOT EXISTS categorias (
          id TEXT PRIMARY KEY,
          nombre TEXT UNIQUE NOT NULL,
          descripcion TEXT,
          activo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla de productos
      CREATE TABLE IF NOT EXISTS productos (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          descripcion TEXT,
          precio REAL NOT NULL CHECK (precio >= 0),
          precio_compra REAL NOT NULL CHECK (precio_compra >= 0),
          categoria_id TEXT NOT NULL,
          stock INTEGER DEFAULT 0 CHECK (stock >= 0),
          stock_minimo INTEGER DEFAULT 5 CHECK (stock_minimo >= 0),
          codigo_barras TEXT UNIQUE,
          imagen_url TEXT,
          activo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (categoria_id) REFERENCES categorias(id)
      );

      -- Tabla de sesiones de caja
      CREATE TABLE IF NOT EXISTS sesiones_caja (
          id TEXT PRIMARY KEY,
          fecha_apertura TIMESTAMP NOT NULL,
          fecha_cierre TIMESTAMP,
          saldo_inicial REAL DEFAULT 0 CHECK (saldo_inicial >= 0),
          saldo_final REAL CHECK (saldo_final >= 0),
          vendedor_id TEXT NOT NULL,
          estado TEXT DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada', 'en_revision')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendedor_id) REFERENCES users(id)
      );

      -- Tabla de ventas
      CREATE TABLE IF NOT EXISTS ventas (
          id TEXT PRIMARY KEY,
          sesion_caja_id TEXT NOT NULL,
          total REAL NOT NULL CHECK (total >= 0),
          vendedor_id TEXT NOT NULL,
          metodo_pago TEXT DEFAULT 'efectivo' CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')),
          efectivo_recibido REAL CHECK (efectivo_recibido >= 0),
          cambio REAL CHECK (cambio >= 0),
          estado TEXT DEFAULT 'completada' CHECK (estado IN ('completada', 'cancelada', 'pendiente')),
          sincronizado BOOLEAN DEFAULT false,
          fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendedor_id) REFERENCES users(id),
          FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja(id)
      );

      -- Tabla de detalles de venta
      CREATE TABLE IF NOT EXISTS detalles_venta (
          id TEXT PRIMARY KEY,
          venta_id TEXT NOT NULL,
          producto_id TEXT NOT NULL,
          cantidad INTEGER NOT NULL CHECK (cantidad > 0),
          precio_unitario REAL NOT NULL CHECK (precio_unitario >= 0),
          subtotal REAL NOT NULL CHECK (subtotal >= 0),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
          FOREIGN KEY (producto_id) REFERENCES productos(id)
      );

      -- Tabla de cierres de caja
      CREATE TABLE IF NOT EXISTS cierres_caja (
          id TEXT PRIMARY KEY,
          sesion_caja_id TEXT NOT NULL,
          fecha_cierre TIMESTAMP NOT NULL,
          total_ventas REAL DEFAULT 0 CHECK (total_ventas >= 0),
          total_efectivo REAL DEFAULT 0 CHECK (total_efectivo >= 0),
          total_tarjeta REAL DEFAULT 0 CHECK (total_tarjeta >= 0),
          vendedor_id TEXT NOT NULL,
          observaciones TEXT,
          estado TEXT DEFAULT 'completado' CHECK (estado IN ('completado', 'en_revision', 'cancelado')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendedor_id) REFERENCES users(id),
          FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja(id)
      );

      -- Tabla de inventario
      CREATE TABLE IF NOT EXISTS inventario (
          id TEXT PRIMARY KEY,
          producto_id TEXT NOT NULL UNIQUE,
          stock_actual INTEGER DEFAULT 0 CHECK (stock_actual >= 0),
          stock_minimo INTEGER DEFAULT 5 CHECK (stock_minimo >= 0),
          ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (producto_id) REFERENCES productos(id)
      );
    `;

    await db.execute(createSchema);
    console.log("✅ Esquema creado");

    // Datos de prueba
    const initData = `
      INSERT INTO users (id, username, email, password_hash, nombre, rol) VALUES 
      ('user_1', 'admin', 'admin@kiosko.com', '$2b$10$ExampleHash', 'Administrador Principal', 'admin'),
      ('user_2', 'vendedor1', 'vendedor@kiosko.com', '$2b$10$ExampleHash', 'Vendedor Uno', 'vendedor');

      INSERT INTO categorias (id, nombre, descripcion) VALUES 
      ('cat_1', 'Bebidas', 'Refrescos, jugos y aguas'),
      ('cat_2', 'Snacks', 'Botanas y dulces'),
      ('cat_3', 'Lácteos', 'Leche, yogurt y quesos'),
      ('cat_4', 'Panadería', 'Pan y productos de panadería');

      INSERT INTO productos (id, nombre, descripcion, precio, precio_compra, categoria_id, stock, stock_minimo) VALUES 
      ('prod_1', 'Coca-Cola 500ml', 'Refresco de cola 500ml', 18.00, 12.00, 'cat_1', 50, 10),
      ('prod_2', 'Sabritas 45g', 'Papas fritas sabritas', 22.00, 15.00, 'cat_2', 30, 5),
      ('prod_3', 'Agua Bonafont 1L', 'Agua purificada', 15.00, 8.00, 'cat_1', 40, 8),
      ('prod_4', 'Pan Bimbo', 'Pan de caja blanco', 35.00, 25.00, 'cat_4', 20, 4),
      ('prod_5', 'Yoplait', 'Yogurt natural', 12.00, 8.00, 'cat_3', 25, 5);

      INSERT INTO inventario (id, producto_id, stock_actual, stock_minimo) VALUES 
      ('inv_1', 'prod_1', 50, 10),
      ('inv_2', 'prod_2', 30, 5),
      ('inv_3', 'prod_3', 40, 8),
      ('inv_4', 'prod_4', 20, 4),
      ('inv_5', 'prod_5', 25, 5);
    `;

    await db.execute(initData);
    console.log("✅ Datos de prueba insertados");

    res.json({
      ok: true,
      message: "Base de datos inicializada exitosamente con esquema corregido",
    });
  } catch (error) {
    console.error("❌ Error inicializando base de datos:", error);
    res.status(500).json({
      ok: false,
      error: "Error inicializando base de datos",
      details: error.message,
    });
  }
});

export default router;
