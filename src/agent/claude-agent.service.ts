import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  query,
  tool,
  createSdkMcpServer,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { WalletService } from '../wallet/wallet.service.js';
import { AgentService } from './agent.service.js';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Connection,
} from '@solana/web3.js';
import { Agent } from './entities/agent.entity.js';

@Injectable()
export class ClaudeAgentService {
  private connection: Connection | null = null;

  constructor(
    private readonly walletService: WalletService,
    private readonly agentService: AgentService,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
  ) {}

  private getConnection(): Connection {
    if (!this.connection) {
      this.connection = new Connection(
        process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
      );
    }
    return this.connection;
  }

  private createWalletToolsServer(agentId?: string) {
    const tools: any[] = [];

    if (!agentId) {
      tools.push(
        tool(
          'create_agent',
          'Creates a new agent with a specified max spend limit',
          {
            maxSpend: z.number().positive().describe('Maximum SOL the agent can spend'),
          },
          async (args) => {
            try {
              const agent = await this.agentService.create({
                max_spend: args.maxSpend.toString(),
              });
              return {
                content: [
                  {
                    type: 'text',
                    text: `Agent created successfully!\nAgent ID: ${agent.id}\nMax Spend: ${agent.max_spend} SOL`,
                  },
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Failed to create agent: ${error.message}`,
                  },
                ],
              };
            }
          },
        ),
      );
    } else {
      tools.push(
        tool(
          'create_wallet',
          'Creates a new Solana wallet for the current agent',
          {},
          async () => {
            try {
              const updatedAgent = await this.agentService.createAgentWallet(agentId);
              return {
                content: [
                  {
                    type: 'text',
                    text: `Wallet created successfully!\nPublic Key: ${updatedAgent.public_key}`,
                  },
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Failed to create wallet: ${error.message}`,
                  },
                ],
              };
            }
          },
        ),

      );

      tools.push(
        tool(
          'get_balance',
          'Gets the SOL balance for the current agent wallet',
          {},
          async () => {
            try {
              const lamports = await this.walletService.getBalance(agentId);
              const sol = lamports / LAMPORTS_PER_SOL;
              return {
                content: [
                  {
                    type: 'text',
                    text: `Balance: ${sol} SOL (${lamports} lamports)`,
                  },
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Error: ${error.message}`,
                  },
                ],
              };
            }
          },
        ),

        tool(
          'get_wallet_address',
          'Gets the public key/address for the current agent wallet',
          {},
          async () => {
            try {
              const { publicKey } = await this.walletService.getWallet(agentId);
              return {
                content: [
                  {
                    type: 'text',
                    text: `Wallet Address: ${publicKey}`,
                  },
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Error: ${error.message}`,
                  },
                ],
              };
            }
          },
        ),

        tool(
          'transfer_sol',
          'Transfer SOL from current agent wallet to another address',
          {
            recipientAddress: z.string().describe('Recipient Solana address'),
            amount: z.number().positive().describe('Amount in SOL'),
          },
          async (args) => {
            try {
              const agent = await this.agentRepository.findOne({
                where: { id: agentId },
              });
              if (!agent) {
                throw new Error('Agent not found');
              }

              const lamports = Math.floor(args.amount * LAMPORTS_PER_SOL);
              const maxSpendLamports = parseFloat(agent.max_spend) * LAMPORTS_PER_SOL;

              if (lamports > maxSpendLamports) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: `Transfer blocked: Amount ${args.amount} SOL exceeds max_spend limit of ${agent.max_spend} SOL`,
                    },
                  ],
                };
              }

              const transaction = await this.buildTransferTx(
                agentId,
                args.recipientAddress,
                lamports,
              );

              const result = await this.walletService.signAndSend(
                agentId,
                transaction,
              );

              return {
                content: [
                  {
                    type: 'text',
                    text:
                      `Transfer successful!\n` +
                      `Amount: ${args.amount} SOL\n` +
                      `To: ${args.recipientAddress}\n` +
                      `Signature: ${result.signature}`,
                  },
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Transfer failed: ${error.message}`,
                  },
                ],
              };
            }
          },
        ),
      );
    }

    return createSdkMcpServer({
      name: 'solana-wallet',
      version: '1.0.0',
      tools,
    });
  }

  async chat(agentId: string | undefined, userMessage: string) {
    let agent: Agent | null = null;
    if (agentId) {
      agent = await this.agentRepository.findOne({ where: { id: agentId } });
    }

    const sessionId = agentId || 'no-agent';

    async function* generateMessages() {
      yield {
        type: 'user' as const,
        message: {
          role: 'user' as const,
          content: userMessage,
        },
        parent_tool_use_id: null,
        session_id: sessionId,
      };
    }

    const messages: string[] = [];
    const walletToolsServer = this.createWalletToolsServer(agentId);

    const allowedTools = agentId
      ? [
          'mcp__solana-wallet__create_wallet',
          'mcp__solana-wallet__get_balance',
          'mcp__solana-wallet__get_wallet_address',
          'mcp__solana-wallet__transfer_sol',
        ]
      : ['mcp__solana-wallet__create_agent'];

    let systemPrompt = '';
    if (agentId && agent) {
      systemPrompt =
        `You are an AI agent managing a Solana wallet. Your agent ID is ${agentId}.\n` +
        `You can create wallets, check balances, view addresses, and transfer SOL.\n` +
        `Always confirm transaction details before executing transfers.\n` +
        `Your maximum spend limit is ${agent.max_spend} SOL. Never exceed this amount.`;
    } else {
      systemPrompt =
        `You are an AI assistant helping users set up their Solana wallet agent.\n` +
        `Currently, no agent exists. You can help users create a new agent with a specified max spend limit.\n` +
        `Use the create_agent tool when the user wants to create an agent.`;
    }

    for await (const message of query({
      prompt: generateMessages(),
      options: {
        mcpServers: {
          'solana-wallet': walletToolsServer,
        },
        allowedTools,
        maxTurns: 10,
        systemPrompt,
      },
    })) {
      if (message.type === 'result') {
        messages.push(JSON.stringify(message));
      } else if (message.type === 'text') {
        messages.push(message.text);
      }
    }

    return { messages };
  }

  private async buildTransferTx(
    agentId: string,
    recipient: string,
    lamports: number,
  ): Promise<Transaction> {
    const { publicKey: fromPubkey } = await this.walletService.getWallet(agentId);

    if (!fromPubkey) {
      throw new Error('Agent has no wallet. Create a wallet first.');
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(fromPubkey),
        toPubkey: new PublicKey(recipient),
        lamports,
      }),
    );

    const { blockhash } = await this.getConnection().getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(fromPubkey);

    return transaction;
  }
}
