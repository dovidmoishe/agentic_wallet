import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { ClaudeAgentService } from '../agent/claude-agent.service.js';
import { AgentService } from '../agent/agent.service.js';
import { WalletService } from '../wallet/wallet.service.js';

export async function bootstrapServices() {
  try {
    process.stdout.write('Bootstrapping Nest (DB + services)...\n');
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });
    const claudeAgentService = app.get(ClaudeAgentService);
    const agentService = app.get(AgentService);
    const walletService = app.get(WalletService);
    return {
      app,
      claudeAgentService,
      agentService,
      walletService,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    process.stdout.write('Bootstrap error: ' + msg + '\n');
    throw error;
  }
}
