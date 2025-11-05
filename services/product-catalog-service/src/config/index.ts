import dotenv from 'dotenv';

// Load environment variables from a .env file if it exists
dotenv.config();

// Export a configuration object with values from environment variables
// providing default fallbacks.
export const config = {
  port: process.env.PORT || 3002,
  mongoUri: process.env.MONGO_URI,
};