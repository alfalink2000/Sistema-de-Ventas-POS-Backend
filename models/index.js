import { db } from "../database/connection.js";

// Los modelos se inicializarán aquí
export const initModels = async () => {
  try {
    await db.sync({ force: false });
    console.log("✅ Modelos sincronizados con la base de datos");
  } catch (error) {
    console.error("❌ Error sincronizando modelos:", error);
  }
};

export { db };
