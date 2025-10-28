// controllers/sesionesCajaController.js - VERSIÓN COMPLETA CORREGIDA
import { SesionCaja } from "../models/SesionCaja.js";

export const obtenerSesionAbierta = async (req, res) => {
  try {
    const { vendedor_id } = req.query;

    console.log(
      "🔍 [BACKEND] Buscando sesión abierta para vendedor:",
      vendedor_id
    );

    if (!vendedor_id) {
      return res.status(400).json({
        ok: false,
        error: "ID de vendedor requerido",
      });
    }

    const sesion = await SesionCaja.findOpenByVendedor(vendedor_id);

    console.log("📦 [BACKEND] Resultado de búsqueda:", {
      encontrada: !!sesion,
      id: sesion?.id,
      estado: sesion?.estado,
      vendedor: sesion?.vendedor_nombre,
    });

    res.json({
      ok: true,
      sesion: sesion,
      existe: !!sesion,
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error al obtener sesión abierta:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener sesión de caja",
    });
  }
};

export const abrirSesion = async (req, res) => {
  try {
    const { vendedor_id, saldo_inicial } = req.body;

    console.log("🔄 [BACKEND] Abriendo sesión:", {
      vendedor_id,
      saldo_inicial,
    });

    if (!vendedor_id) {
      return res.status(400).json({
        ok: false,
        error: "ID de vendedor requerido",
      });
    }

    // Verificar si ya existe una sesión abierta
    console.log("🔍 [BACKEND] Verificando sesión existente...");
    const sesionExistente = await SesionCaja.findOpenByVendedor(vendedor_id);

    if (sesionExistente) {
      console.log("❌ [BACKEND] Ya existe sesión abierta:", sesionExistente.id);
      return res.status(400).json({
        ok: false,
        error: "Ya existe una sesión de caja abierta para este vendedor",
      });
    }

    console.log("✅ [BACKEND] No hay sesión existente, creando nueva...");

    // CREAR LA SESIÓN
    const sesionId = await SesionCaja.create({
      vendedor_id,
      saldo_inicial: parseFloat(saldo_inicial) || 0,
    });

    console.log("✅ [BACKEND] Sesión creada con ID:", sesionId);

    // Pequeña pausa para asegurar que la sesión se guardó
    await new Promise((resolve) => setTimeout(resolve, 100));

    // OBTENER LA SESIÓN RECIÉN CREADA
    console.log("🔍 [BACKEND] Recuperando sesión creada...");
    const nuevaSesion = await SesionCaja.findById(sesionId);

    if (!nuevaSesion) {
      console.error("❌ [BACKEND] No se pudo recuperar la sesión creada");

      // ALTERNATIVA: Retornar datos básicos sin consultar nuevamente
      return res.status(201).json({
        ok: true,
        message: "Sesión de caja abierta exitosamente",
        sesion: {
          id: sesionId,
          fecha_apertura: new Date().toISOString(),
          saldo_inicial: parseFloat(saldo_inicial) || 0,
          vendedor_id: vendedor_id,
          estado: "abierta",
          vendedor_nombre: "Usuario", // Placeholder
          vendedor_username: "usuario", // Placeholder
        },
      });
    }

    console.log("✅ [BACKEND] Sesión recuperada exitosamente:", {
      id: nuevaSesion.id,
      estado: nuevaSesion.estado,
      vendedor: nuevaSesion.vendedor_nombre,
    });

    res.status(201).json({
      ok: true,
      message: "Sesión de caja abierta exitosamente",
      sesion: nuevaSesion,
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error al abrir sesión de caja:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al abrir sesión de caja: " + error.message,
    });
  }
};

export const cerrarSesion = async (req, res) => {
  try {
    const { sesionId } = req.params;
    const { saldo_final, observaciones = null } = req.body;

    console.log("🔄 [BACKEND] Cerrando sesión:", {
      sesionId,
      saldo_final,
      observaciones,
    });

    // ✅ CORREGIDO: Validar que saldo_final sea un número válido
    if (saldo_final === undefined || saldo_final === null) {
      return res.status(400).json({
        ok: false,
        error: "Saldo final requerido",
      });
    }

    const saldoFinalNumero = parseFloat(saldo_final);

    // ✅ CORREGIDO: Validar que sea un número finito
    if (isNaN(saldoFinalNumero) || !isFinite(saldoFinalNumero)) {
      return res.status(400).json({
        ok: false,
        error: "El saldo final debe ser un número válido",
      });
    }

    if (saldoFinalNumero < 0) {
      return res.status(400).json({
        ok: false,
        error: "El saldo final no puede ser negativo",
      });
    }

    console.log("✅ [BACKEND] Datos validados correctamente:", {
      sesionId,
      saldo_final: saldoFinalNumero,
      observaciones,
    });

    // ✅ CORREGIDO: Pasar objeto con todos los datos
    const success = await SesionCaja.close(sesionId, {
      saldo_final: saldoFinalNumero,
      observaciones: observaciones,
    });

    if (!success) {
      return res.status(404).json({
        ok: false,
        error: "Sesión no encontrada o no se pudo cerrar",
      });
    }

    console.log("✅ [BACKEND] Sesión cerrada exitosamente:", sesionId);

    res.json({
      ok: true,
      message: "Sesión de caja cerrada exitosamente",
      sesionId: sesionId,
      saldo_final: saldoFinalNumero,
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error al cerrar sesión de caja:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al cerrar sesión de caja: " + error.message,
    });
  }
};

export const obtenerSesionesVendedor = async (req, res) => {
  try {
    const { vendedor_id } = req.params;
    const { limite = 30 } = req.query;

    console.log("🔍 [BACKEND] Obteniendo sesiones para vendedor:", vendedor_id);

    const sesiones = await SesionCaja.findByVendedor(
      vendedor_id,
      parseInt(limite)
    );

    console.log("📦 [BACKEND] Sesiones encontradas:", sesiones.count);

    res.json({
      ok: true,
      sesiones: sesiones.rows,
      total: sesiones.count,
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error al obtener sesiones:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener sesiones de caja",
    });
  }
};

// CONTROLADOR ADICIONAL: Obtener sesión por ID
export const obtenerSesionPorId = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🔍 [BACKEND] Buscando sesión por ID:", id);

    const sesion = await SesionCaja.findById(id);

    if (!sesion) {
      return res.status(404).json({
        ok: false,
        error: "Sesión no encontrada",
      });
    }

    console.log("✅ [BACKEND] Sesión encontrada:", sesion.id);

    res.json({
      ok: true,
      sesion: sesion,
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error al obtener sesión por ID:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener sesión",
    });
  }
};
