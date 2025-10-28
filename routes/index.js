// routes/index.js (si existe)
import { Router } from "express";
import authRoutes from "./auth.js";
import productosRoutes from "./productos.js";
import categoriasRoutes from "./categorias.js";
import ventasRoutes from "./ventas.js";
import cierresRoutes from "./cierresCaja.js";
import inventarioRoutes from "./inventario.js";
import detallesVentaRoutes from "./detallesVenta.js";
import sesionesCajaRoutes from "./sesionesCaja.js";
import diagnosticRoutes from "./diagnostic.js"; // ✅ NUEVA

const router = Router();

router.use("/auth", authRoutes);
router.use("/productos", productosRoutes);
router.use("/categorias", categoriasRoutes);
router.use("/ventas", ventasRoutes);
router.use("/cierres", cierresRoutes);
router.use("/inventario", inventarioRoutes);
router.use("/detalles-venta", detallesVentaRoutes);
router.use("/sesiones-caja", sesionesCajaRoutes);
router.use("/diagnostic", diagnosticRoutes); // ✅ NUEVA

export default router;
