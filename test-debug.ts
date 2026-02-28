import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module.js';

async function test() {
  console.log('Starting test with debug logging...');
  
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  
  console.log('Context created successfully!');
  await app.close();
  process.exit(0);
}

test().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
