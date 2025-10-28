import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

class TursoDB {
  constructor() {
    this.client = null;
    this.connected = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.init();
  }

  async init() {
    try {
      if (process.env.TURSO_DB_URL && process.env.TURSO_AUTH_TOKEN) {
        console.log("🌐 Inicializando conexión a Turso...");
        console.log(`   📍 URL: ${process.env.TURSO_DB_URL}`);
        console.log(`   🔄 Intentos máximos: ${this.maxRetries}`);

        this.client = createClient({
          url: process.env.TURSO_DB_URL,
          authToken: process.env.TURSO_AUTH_TOKEN,
          // CONFIGURACIÓN CRÍTICA - TIMEOUTS AUMENTADOS
          timeoutMs: 30000, // 30 segundos en lugar de 10
          // Configuración específica para fetch
          fetch: (url, options) => {
            return fetch(url, {
              ...options,
              // Timeouts más tolerantes
              signal: AbortSignal.timeout(45000), // 45 segundos máximo
            });
          },
        });

        // Testear conexión con reintentos
        await this.testConnectionWithRetry();
        this.connected = true;
        console.log("🎉 CONEXIÓN A TURSO ESTABLECIDA CORRECTAMENTE");
      } else {
        console.error("❌ Faltan credenciales de Turso");
        console.log(
          "   TURSO_DB_URL:",
          process.env.TURSO_DB_URL ? "✅ Presente" : "❌ Faltante"
        );
        console.log(
          "   TURSO_AUTH_TOKEN:",
          process.env.TURSO_AUTH_TOKEN ? "✅ Presente" : "❌ Faltante"
        );
        throw new Error("Credenciales de Turso incompletas");
      }
    } catch (error) {
      console.error("💥 Error crítico conectando a Turso:", error.message);
      this.connected = false;

      // Reintentar automáticamente después de 5 segundos
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(
          `🔄 Reintentando conexión en 5 segundos... (${this.retryCount}/${this.maxRetries})`
        );
        setTimeout(() => this.init(), 5000);
      } else {
        throw error;
      }
    }
  }

  async testConnectionWithRetry() {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(
          `🧪 Probando conexión a Turso... Intento ${attempt}/${this.maxRetries}`
        );
        const startTime = Date.now();

        const result = await this.client.execute(
          "SELECT datetime() as server_time, 1 as test_value"
        );

        const duration = Date.now() - startTime;
        console.log(`✅ Conexión a Turso exitosa [${duration}ms]`);
        console.log(`   ⏰ Hora del servidor: ${result.rows[0].server_time}`);
        console.log(`   ✅ Valor de test: ${result.rows[0].test_value}`);

        this.retryCount = 0; // Resetear contador en éxito
        return true;
      } catch (error) {
        console.error(`❌ Intento ${attempt} fallido:`, error.message);

        if (attempt < this.maxRetries) {
          const waitTime = attempt * 2000; // Backoff exponencial: 2s, 4s, 6s...
          console.log(
            `⏳ Esperando ${waitTime}ms antes del próximo intento...`
          );
          await this.delay(waitTime);
        } else {
          throw new Error(
            `No se pudo conectar después de ${this.maxRetries} intentos: ${error.message}`
          );
        }
      }
    }
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async query(sql, params = []) {
    if (!this.client || !this.connected) {
      throw new Error("Turso no está conectado");
    }

    const startTime = Date.now();

    try {
      if (process.env.NODE_ENV === "development") {
        console.log(`📊 Turso Query: ${sql.substring(0, 100)}...`);
      }

      const result = await this.client.execute({
        sql,
        args: params,
      });

      const duration = Date.now() - startTime;

      if (process.env.NODE_ENV === "development") {
        console.log(
          `✅ Turso Query [${duration}ms] - ${result.rows.length} filas`
        );
      }

      return {
        rows: result.rows,
        columns: result.columns,
        rowsAffected: result.rowsAffected,
        lastInsertRowid: result.lastInsertRowid,
      };
    } catch (error) {
      console.error(
        `💥 Error en Turso query [${Date.now() - startTime}ms]:`,
        error.message
      );
      console.error(`   SQL: ${sql}`);

      // Reintentar automáticamente queries que fallan
      if (
        error.message.includes("timeout") ||
        error.message.includes("fetch failed")
      ) {
        console.log("🔄 Reintentando query debido a timeout...");
        await this.delay(2000);
        return this.query(sql, params); // Recurrir
      }

      throw error;
    }
  }

  // Métodos compatibles para tus modelos
  async execute(sql, params = []) {
    return this.query(sql, params);
  }

  async all(sql, params = []) {
    const result = await this.query(sql, params);
    return result.rows;
  }

  async get(sql, params = []) {
    const result = await this.query(sql, params);
    return result.rows[0] || null;
  }

  async run(sql, params = []) {
    const result = await this.query(sql, params);
    return {
      changes: result.rowsAffected,
      lastID: result.lastInsertRowid,
    };
  }

  isConnected() {
    return this.connected;
  }

  // Verificar estado de la base de datos
  async getDatabaseInfo() {
    try {
      const tables = await this.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);

      return {
        tables: tables.map((t) => t.name),
        total_tables: tables.length,
        status: "connected",
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
      };
    }
  }
}

// Crear instancia y exportar
export const db = new TursoDB();
