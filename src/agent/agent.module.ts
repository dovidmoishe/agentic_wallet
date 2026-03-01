import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity.js';
import { AgentService } from './agent.service.js';
import { ClaudeAgentService } from './claude-agent.service.js';
import { WalletModule } from '../wallet/wallet.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Agent]), WalletModule],
  providers: [AgentService, ClaudeAgentService],
  exports: [AgentService, ClaudeAgentService],
})
export class AgentModule {}
