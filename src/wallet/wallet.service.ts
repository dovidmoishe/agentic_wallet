import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { randomBytes } from 'crypto';
import { CryptoService } from './crypto.service';
import { Agent } from '../agent/entities/agent.entity';

@Injectable()
export class WalletService {
  private connection: Connection;

  constructor(
    private readonly cryptoService: CryptoService,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
  ) {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    );
  }

  createWallet() {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const privateKey = Buffer.from(keypair.secretKey).toString('hex');

    const aek = randomBytes(32);
    const masterKey = Buffer.from(process.env.MASTER_KEY || '', 'hex');

    const encryptedPrivateKey = this.cryptoService.encrypt(privateKey, aek);
    const encryptedAek = this.cryptoService.encrypt(aek.toString('hex'), masterKey);

    return {
      public_key: publicKey,
      encrypted_private_key: encryptedPrivateKey,
      encrypted_agent_key: encryptedAek,
    };
  }

  async getWallet(agentId: string) {
    const agent = await this.agentRepository.findOne({ where: { id: agentId } });
    if (!agent) {
      throw new Error('Agent not found');
    }
    return { publicKey: agent.public_key };
  }

  async getBalance(agentId: string) {
    const agent = await this.agentRepository.findOne({ where: { id: agentId } });
    if (!agent) {
      throw new Error('Agent not found');
    }

    const publicKey = new PublicKey(agent.public_key);
    const balance = await this.connection.getBalance(publicKey);
    return balance;
  }

  async signAndSend(agentId: string, transaction: Transaction) {
    const agent = await this.agentRepository.findOne({ where: { id: agentId } });
    if (!agent) {
      throw new Error('Agent not found');
    }

    const masterKey = Buffer.from(process.env.MASTER_KEY || '', 'hex');
    const aekHex = this.cryptoService.decrypt(agent.encrypted_agent_key, masterKey);
    const aek = Buffer.from(aekHex, 'hex');

    const privateKeyHex = this.cryptoService.decrypt(agent.encrypted_private_key, aek);
    const privateKey = Buffer.from(privateKeyHex, 'hex');

    const keypair = Keypair.fromSecretKey(privateKey);

    const simulationResult = await this.connection.simulateTransaction(transaction);
    if (simulationResult.value.err) {
      throw new Error(`Simulation failed: ${JSON.stringify(simulationResult.value.err)}`);
    }

    transaction.sign(keypair);
    const signature = await this.connection.sendRawTransaction(transaction.serialize());

    return { signature };
  }
}
