import dotenv from 'dotenv';

// Load environment variables from a .env file (if it exists)
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'default_secret',
  databaseUrl: process.env.DATABASE_URL,
};