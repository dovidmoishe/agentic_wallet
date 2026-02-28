import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  let url = process.env.DATABASE_URL;
  const needsSsl =
    process.env.DB_SSL === 'true' ||
    (url && /sslmode=require|ssl=true|:6543\b/.test(url));
  if (url && needsSsl) {
    url = url
      .replace(/\?sslmode=[^&]+&?/, '?')
      .replace(/&sslmode=[^&]+/, '')
      .replace(/\?$/, '');
  }
  return {
    type: 'postgres',
    url,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
    synchronize: process.env.DB_SYNC === 'true',
    logging: process.env.DB_LOGGING === 'true',
    connectTimeoutMS: 15000,
  };
});
