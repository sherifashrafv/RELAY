import { Pool } from 'pg';
import { env } from './env.js';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('New database connection established');
});

pool.on('error', (error) => {
  console.error('Unexpected database error:', error);
});


export const testConnection = async () => {
  try { 
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection test successful:', result.rows[0].now);
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}