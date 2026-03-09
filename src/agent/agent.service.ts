import { Injectable, NotFoundException } from '@nestjs/common';
import { Agent } from './entities/agent.entity.js';
import { WalletService } from '../wallet/wallet.service.js';
import { JsonDbService } from '../database/json-db.service.js';

@Injectable()
export class AgentService {
  constructor(
    private readonly jsonDb: JsonDbService,
    private readonly walletService: WalletService,
  ) {}

  async create(agentData: Partial<Agent>): Promise<Agent> {
    if (!agentData.max_spend) {
      throw new Error('max_spend is required');
    }
    const agent = this.jsonDb.create(agentData);
    return this.jsonDb.save(agent);
  }

  async findAll(): Promise<Agent[]> {
    return this.jsonDb.find();
  }

  async findOne(id: string): Promise<Agent | null> {
    return this.jsonDb.findOne({ where: { id } });
  }

  async findByPublicKey(publicKey: string): Promise<Agent | null> {
    return this.jsonDb.findOne({ where: { public_key: publicKey } });
  }

  async createAgentWallet(id: string): Promise<Agent> {
    const agent = await this.findOne(id);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    const wallet = this.walletService.createWallet();
    return this.jsonDb.save({
      ...agent,
      public_key: wallet.public_key,
      encrypted_private_key: wallet.encrypted_private_key,
      encrypted_agent_key: wallet.encrypted_agent_key,
    });
  }
}
