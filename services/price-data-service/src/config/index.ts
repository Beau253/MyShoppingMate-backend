import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3003,
  databaseUrl: process.env.DATABASE_URL,
};