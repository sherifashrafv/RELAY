
import 'dotenv/config';
import app from './app.js';
import { env } from './config/env.js';
import { testConnection } from './config/db.js';

const startServer = async () => {
  try {
    await testConnection();

    app.listen(env.PORT, () => {
      console.log(
        `Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`
      );
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
