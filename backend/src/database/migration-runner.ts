
import { pool } from '../config/db.js';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

const migrationsDir = path.resolve(
  currentDir,
  '../../migrations'
);

const runMigrations = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    const executedResult = await client.query<{ name: string }>(
      'SELECT name FROM migrations'
    );

    const executedMigrations = new Set(
      executedResult.rows.map((row) => row.name)
    );

    for (const file of files) {
      if (executedMigrations.has(file)) {
        console.log(`Skipping already executed migration: ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = await readFile(filePath, 'utf-8');

      await client.query('BEGIN');

      try {
        await client.query(sql);

        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        );

        await client.query('COMMIT');

        console.log(`Migration executed: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
  }
};

export default runMigrations;
