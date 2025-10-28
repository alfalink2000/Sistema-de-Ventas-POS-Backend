import { verificarJWT } from "../helpers/jwt.js";

export const validarJWT = (req, res, next) => {
  const token = req.header("x-token");

  if (!token) {
    return res.status(401).json({
      ok: false,
      msg: "No hay token en la petición",
    });
  }

  try {
    const { uid, name, rol } = verificarJWT(token);

    req.uid = uid;
    req.name = name;
    req.rol = rol;

    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      msg: "Token no válido",
    });
  }
};

export const validarRol = (rolesPermitidos = []) => {
  return (req, res, next) => {
    if (!req.rol) {
      return res.status(401).json({
        ok: false,
        msg: "Se requiere verificar token primero",
      });
    }

    if (!rolesPermitidos.includes(req.rol)) {
      return res.status(403).json({
        ok: false,
        msg: `No tiene permisos para esta acción. Rol requerido: ${rolesPermitidos.join(
          ", "
        )}`,
      });
    }

    next();
  };
};
