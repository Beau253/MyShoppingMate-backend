import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString: DATABASE_URL,
});

export const testDbConnection = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connection successful.');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};