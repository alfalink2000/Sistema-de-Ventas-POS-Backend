import { DataTypes } from "sequelize";
import { db } from "../database/connection.js";

const User = db.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    rol: {
      type: DataTypes.ENUM("admin", "vendedor", "cajero"),
      defaultValue: "vendedor",
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    ultimo_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
  }
);

export default User;
