import { DataTypes } from "sequelize";
import { db } from "../database/connection.js";

const Inventario = db.define(
  "Inventario",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    producto_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    stock_actual: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    stock_minimo: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
    },
    ultima_actualizacion: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "inventario",
    timestamps: true,
  }
);

export default Inventario;
