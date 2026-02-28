import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { AgentService } from './agent.service';
import { ClaudeAgentService } from './claude-agent.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [TypeOrmModule.forFeature([Agent]), WalletModule],
  providers: [AgentService, ClaudeAgentService],
  exports: [AgentService, ClaudeAgentService],
})
export class AgentModule {}
