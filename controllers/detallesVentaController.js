// controllers/detallesVentaController.js
import { DetalleVenta } from "../models/DetalleVenta.js";

export const obtenerDetallesPorVenta = async (req, res) => {
  try {
    const { ventaId } = req.params;

    const detalles = await DetalleVenta.findByVentaId(ventaId);

    res.json({
      ok: true,
      ventaId,
      detalles: detalles.rows,
      total: detalles.rows.length,
    });
  } catch (error) {
    console.error("Error al obtener detalles de venta:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al obtener detalles de venta",
    });
  }
};

export const crearDetallesVenta = async (req, res) => {
  try {
    const { detalles } = req.body;

    if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Se requiere un array de detalles de venta",
      });
    }

    await DetalleVenta.createBatch(detalles);

    res.status(201).json({
      ok: true,
      message: "Detalles de venta creados exitosamente",
      total: detalles.length,
    });
  } catch (error) {
    console.error("Error al crear detalles de venta:", error);
    res.status(500).json({
      ok: false,
      error: "Error interno al crear detalles de venta",
    });
  }
};
