import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { AgentService } from './agent.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agent])],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
