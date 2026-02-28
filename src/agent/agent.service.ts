import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity.js';
import { WalletService } from '../wallet/wallet.service.js';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    private readonly walletService: WalletService,
  ) {}

  async create(agentData: Partial<Agent>): Promise<Agent> {
    const agent = this.agentRepository.create(agentData);
    return this.agentRepository.save(agent);
  }

  async findAll(): Promise<Agent[]> {
    return this.agentRepository.find();
  }

  async findOne(id: string): Promise<Agent | null> {
    return this.agentRepository.findOne({ where: { id } });
  }

  async findByPublicKey(publicKey: string): Promise<Agent | null> {
    return this.agentRepository.findOne({ where: { public_key: publicKey } });
  }
  async createAgentWallet(id: string): Promise<Agent> {
    const agent = await this.findOne(id);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    const wallet = this.walletService.createWallet();
    return this.agentRepository.save({ ...agent, public_key: wallet.public_key, encrypted_private_key: wallet.encrypted_private_key, encrypted_agent_key: wallet.encrypted_agent_key });
  }

}
