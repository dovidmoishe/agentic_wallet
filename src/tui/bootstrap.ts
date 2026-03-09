import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { GeminiAgentService, setAppContext } from '../agent/gemini-agent.service.js';

export async function bootstrapServices() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  setAppContext(app);

  const geminiAgentService = app.get(GeminiAgentService);

  return { app, geminiAgentService };
}
