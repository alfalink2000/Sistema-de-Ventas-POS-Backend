// middlewares/uploadMiddleware.js - CORREGIDO
import multer from "multer";

// ✅ Configuración de multer en memoria
const storage = multer.memoryStorage();

// ✅ Filtro de archivos mejorado
const fileFilter = (req, file, cb) => {
  console.log("📁 Procesando archivo:", file.originalname);

  if (file.mimetype.startsWith("image/")) {
    console.log("✅ Archivo de imagen aceptado");
    cb(null, true);
  } else if (file.fieldname === "imagen" && !file.originalname) {
    // ✅ Permitir cuando no hay archivo (edición sin cambiar imagen)
    console.log("📭 Campo de imagen vacío - permitido para ediciones");
    cb(null, false);
  } else {
    console.log("❌ Tipo de archivo no permitido:", file.mimetype);
    cb(new Error("Solo se permiten archivos de imagen"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// ✅ Middleware personalizado que maneja mejor la ausencia de archivos
const uploadMiddleware = (req, res, next) => {
  console.log("🔄 Iniciando procesamiento de upload...");

  upload.single("imagen")(req, res, function (err) {
    if (err) {
      console.error("❌ Error en upload middleware:", err.message);

      // ✅ Si es error de tipo de archivo, enviar error 400
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            ok: false,
            msg: "La imagen es demasiado grande. Máximo 5MB permitido.",
          });
        }
      }

      // ✅ Para otros errores de multer
      if (err.message.includes("Solo se permiten archivos de imagen")) {
        return res.status(400).json({
          ok: false,
          msg: "Solo se permiten archivos de imagen (JPG, PNG, GIF)",
        });
      }

      // ✅ Para otros errores, continuar (permitir ediciones sin imagen)
      console.log("⚠️  Error no crítico en upload, continuando...");
    }

    console.log("✅ Upload middleware completado");
    console.log("📦 Body recibido:", req.body);
    console.log("📁 File recibido:", req.file ? "Sí" : "No");

    next();
  });
};

export default uploadMiddleware;
