import dotenv from "dotenv";

const result = dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,

  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
};



