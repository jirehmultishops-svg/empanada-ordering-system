import type { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

function getConnectionConfig(): Knex.PgConnectionConfig | string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'empanadas_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };
}

const baseConfig: Knex.Config = {
  client: 'pg',
  connection: getConnectionConfig(),
  migrations: {
    directory: './src/db/migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './src/db/seeds',
    extension: 'ts',
  },
};

const config: Record<string, Knex.Config> = {
  development: {
    ...baseConfig,
  },
  test: {
    ...baseConfig,
    connection: process.env.DATABASE_URL_TEST || {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME_TEST || 'empanadas_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
  },
  production: {
    ...baseConfig,
    pool: {
      min: 2,
      max: 10,
    },
  },
};

export default config;
