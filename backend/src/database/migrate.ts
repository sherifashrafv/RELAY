import runMigrations from './migration-runner.js';
import { pool } from '../config/db.js';

const main = async () => {
  try {
    await runMigrations();
    console.log('Migration runner initialized');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

main();