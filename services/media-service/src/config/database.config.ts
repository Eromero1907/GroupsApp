import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const dbUseSsl = (): boolean => {
  const v = process.env.DB_SSL;
  return v === 'true' || v === '1';
};

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'media_db',
  autoLoadEntities: true,
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  ssl: dbUseSsl() ? { rejectUnauthorized: false } : false,
});
