import { Pool } from 'pg';
import { config } from '../config';

// Create a new connection pool. The pool manages multiple connections
// to the database, which is more efficient than creating a new one for every query.
export const pool = new Pool({
  connectionString: config.databaseUrl,
});

// A simple function to test the connection.
export const testDbConnection = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connection successful.');
  } catch (error) {
    console.error('Database connection failed:', error);
    // Exit the process if we can't connect to the database on startup.
    process.exit(1);
  }
};