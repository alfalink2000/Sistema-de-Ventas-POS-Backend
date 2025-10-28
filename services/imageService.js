// services/imageService.js - VERSIÓN MÁS RÁPIDA
import axios from "axios";
import sharp from "sharp";

export const uploadToImgBB = async (fileBuffer) => {
  try {
    console.log("🔄 Optimizando imagen...");

    // ✅ ESTRATEGIA MÁS RÁPIDA: Reducir calidad y tamaño
    const optimizedImage = await sharp(fileBuffer)
      .resize(800, 600, {
        // ✅ Tamaño más pequeño
        fit: "inside",
        withoutEnlargement: true,
        fastShrinkOnLoad: true,
      })
      .jpeg({
        quality: 60, // ✅ Calidad más baja para mayor velocidad
        mozjpeg: true,
        chromaSubsampling: "4:2:0",
      })
      .toBuffer();

    const originalSizeKB = Math.round(fileBuffer.length / 1024);
    const compressedSizeKB = Math.round(optimizedImage.length / 1024);
    const reduction = Math.round((1 - compressedSizeKB / originalSizeKB) * 100);

    console.log(
      `📊 Compresión: ${originalSizeKB}KB → ${compressedSizeKB}KB (${reduction}% reducido)`
    );

    // ✅ SUBIR A IMGBBB CON TIMEOUT MÁS CORTO
    console.log("📤 Subiendo a ImgBB...");
    const base64Image = optimizedImage.toString("base64");

    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
      throw new Error(
        "IMGBB_API_KEY no está configurada en las variables de entorno"
      );
    }

    const response = await axios.post(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      `image=${encodeURIComponent(base64Image)}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 20000, // ✅ 20 segundos máximo para subir
      }
    );

    if (response.data.success) {
      console.log("✅ Imagen subida exitosamente a:", response.data.data.url);
      return response.data.data.url;
    } else {
      throw new Error(
        response.data.error?.message || "Error desconocido de ImgBB"
      );
    }
  } catch (error) {
    console.error("❌ Error en uploadToImgBB:", error);
    throw error;
  }
};
