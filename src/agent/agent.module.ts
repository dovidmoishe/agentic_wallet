import { Module } from '@nestjs/common';
import { AgentService } from './agent.service.js';
import { GeminiAgentService } from './gemini-agent.service.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [WalletModule, DatabaseModule],
  providers: [AgentService, GeminiAgentService],
  exports: [AgentService, GeminiAgentService],
})
export class AgentModule {}
