import jwt from "jsonwebtoken";

export const generarJWT = (uid, name, rol) => {
  return new Promise((resolve, reject) => {
    const payload = { uid, name, rol };

    // ✅ Verificar que la firma existe
    if (!process.env.JWT_SECRET) {
      console.error(
        "❌ JWT_SECRET no está definida en las variables de entorno"
      );
      return reject("Error de configuración del servidor");
    }

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {
        expiresIn: "8h", // 8 horas para una jornada laboral
      },
      (error, token) => {
        if (error) {
          console.log("❌ Error generando JWT:", error);
          reject("No se pudo generar el token");
        }

        resolve(token);
      }
    );
  });
};

export const verificarJWT = (token) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET no configurado");
    }

    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("❌ Error verificando JWT:", error.message);
    throw new Error("Token inválido");
  }
};
