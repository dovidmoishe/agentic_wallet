import { Module } from '@nestjs/common';
import { AgentService } from './agent.service.js';
import { ClaudeAgentService } from './claude-agent.service.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [WalletModule, DatabaseModule],
  providers: [AgentService, ClaudeAgentService],
  exports: [AgentService, ClaudeAgentService],
})
export class AgentModule {}
