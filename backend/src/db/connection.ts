import knex, { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

function getConnectionConfig(): Knex.PgConnectionConfig | string {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    } as unknown as string;
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'empanadas_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };
}

const environment = process.env.NODE_ENV || 'development';

const knexConfig: Knex.Config = {
  client: 'pg',
  connection: environment === 'test'
    ? (process.env.DATABASE_URL_TEST || {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME_TEST || 'empanadas_test',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      })
    : getConnectionConfig(),
  migrations: {
    directory: './src/db/migrations',
    extension: 'ts',
  },
};

const db: Knex = knex(knexConfig);

export default db;
