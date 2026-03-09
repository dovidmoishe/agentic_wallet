import { GoogleGenAI, Type } from '@google/genai';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { INestApplicationContext } from '@nestjs/common';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Connection,
  Keypair,
} from '@solana/web3.js';
import { randomBytes } from 'crypto';
import { createHelius } from 'helius-sdk';
import { Agent } from './entities/agent.entity.js';
import { JsonDbService } from '../database/json-db.service.js';
import { CryptoService } from '../wallet/crypto.service.js';
import { WalletService } from '../wallet/wallet.service.js';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const JUPITER_QUOTE = 'https://devnet.jup.ag/swap/v1/quote';
const JUPITER_SWAP = 'https://devnet.jup.ag/swap/v1/swap';

let appContext: INestApplicationContext | null = null;

export function setAppContext(app: INestApplicationContext): void {
  appContext = app;
}

export function getApp(): INestApplicationContext {
  if (!appContext) throw new Error('App context not set. Bootstrap must run first.');
  return appContext;
}

@Injectable()
export class GeminiAgentService {
  private readonly genAI: GoogleGenAI;
  private connection: Connection | null = null;

  private readonly createAgentTool = {
    name: 'create_agent',
    description:
      'Creates a new agent with a specified max spend limit (in SOL). Call this when the user wants to create an agent. Creates the agent and a wallet in one step.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        maxSpend: {
          type: Type.NUMBER,
          description: 'Maximum SOL the agent can spend',
        },
      },
      required: ['maxSpend'],
    },
  };

  private readonly createWalletTool = {
    name: 'create_wallet',
    description: 'Creates a new Solana wallet for the current agent.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  };

  private readonly getBalanceTool = {
    name: 'get_balance',
    description: 'Gets the SOL balance for the current agent wallet.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  };

  private readonly getWalletAddressTool = {
    name: 'get_wallet_address',
    description: 'Gets the public key/address for the current agent wallet.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  };

  private readonly transferSolTool = {
    name: 'transfer_sol',
    description:
      'Transfer SOL from current agent wallet to another address. Respect max_spend limit.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipientAddress: {
          type: Type.STRING,
          description: 'Recipient Solana address',
        },
        amount: {
          type: Type.NUMBER,
          description: 'Amount in SOL',
        },
      },
      required: ['recipientAddress', 'amount'],
    },
  };

  private readonly requestAirdropTool = {
    name: 'request_airdrop',
    description:
      'Request a Devnet SOL airdrop to the current agent wallet. Use when the agent needs SOL on Devnet (e.g. low balance). Amount in SOL, default 0.5, max 2. Rate limited (e.g. 2 per 8h per IP).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: {
          type: Type.NUMBER,
          description: 'Amount in SOL to airdrop (default 1)',
        },
      },
      required: [],
    },
  };

  private readonly getAssetsByOwnerTool = {
    name: 'get_assets_by_owner',
    description:
      'Get fungible tokens (and other assets) owned by a Solana address using Helius. Use this to list tokens an owner holds so you can buy the same tokens. Returns mint addresses, symbols, and names.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        ownerAddress: {
          type: Type.STRING,
          description: 'Solana wallet address to fetch assets for',
        },
        page: {
          type: Type.NUMBER,
          description: 'Page number (default 1)',
        },
        limit: {
          type: Type.NUMBER,
          description: 'Max items per page (default 50)',
        },
      },
      required: ['ownerAddress'],
    },
  };

  private readonly buyTokenTool = {
    name: 'buy_token',
    description:
      'Buy an SPL token with SOL via Jupiter swap. Spend SOL (default 0.1 SOL per call) to receive the token at the given mint address. Respect max_spend. Use after get_assets_by_owner to buy each token an owner holds.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        mintAddress: {
          type: Type.STRING,
          description: 'SPL token mint address to buy',
        },
        amountSol: {
          type: Type.NUMBER,
          description: 'Amount of SOL to spend (default 0.1)',
        },
      },
      required: ['mintAddress'],
    },
  };

  constructor(
    private readonly walletService: WalletService,
    private readonly jsonDb: JsonDbService,
  ) {
    const aiApiKey = process.env.GEMINI_API_KEY;
    if (!aiApiKey) {
      throw new Error('AI API Key is not configured');
    }
    this.genAI = new GoogleGenAI({ apiKey: aiApiKey });
  }

  async createAgent(agentData: Partial<Agent>): Promise<Agent> {
    if (!agentData.max_spend) throw new Error('max_spend is required');
    const agent = this.jsonDb.create(agentData);
    return this.jsonDb.save(agent);
  }

  async createAgentWallet(id: string): Promise<Agent> {
    const agent = await this.jsonDb.findOne({ where: { id } });
    if (!agent) throw new NotFoundException('Agent not found');
    const wallet = this.walletService.createWallet();
    return this.jsonDb.save({
      ...agent,
      public_key: wallet.public_key,
      encrypted_private_key: wallet.encrypted_private_key,
      encrypted_agent_key: wallet.encrypted_agent_key,
    });
  }

  private getConnection(): Connection {
    if (!this.connection) {
      this.connection = new Connection(
        process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
      );
    }
    return this.connection;
  }

  async buildTransferTx(
    agentId: string,
    recipient: string,
    lamports: number,
  ): Promise<Transaction> {
    const { publicKey: fromPubkey } = await this.walletService.getWallet(agentId);
    if (!fromPubkey) throw new Error('Agent has no wallet. Create a wallet first.');

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

  private createWalletInline(cryptoService: CryptoService): { public_key: string; encrypted_private_key: { data: string; iv: string; tag: string }; encrypted_agent_key: { data: string; iv: string; tag: string } } {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const privateKey = Buffer.from(keypair.secretKey).toString('hex');
    const aek = randomBytes(32);
    const masterKey = Buffer.from(process.env.MASTER_KEY || '', 'hex');
    const encryptedPrivateKey = cryptoService.encrypt(privateKey, aek);
    const encryptedAek = cryptoService.encrypt(aek.toString('hex'), masterKey);
    return { public_key: publicKey, encrypted_private_key: encryptedPrivateKey, encrypted_agent_key: encryptedAek };
  }

  private async executeTool(
    name: string,
    args: Record<string, unknown>,
    agentId: string | undefined,
    deps: { jsonDb: JsonDbService; cryptoService: CryptoService },
  ): Promise<string> {
    const { jsonDb, cryptoService } = deps;
    const connection = new Connection(process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com');
    try {
      if (name === 'create_agent') {
        const maxSpend = String(args?.maxSpend ?? '');
        if (!maxSpend) throw new Error('max_spend is required');
        const agent = jsonDb.create({ max_spend: maxSpend });
        const saved = await jsonDb.save(agent);
        const wallet = this.createWalletInline(cryptoService);
        const withWallet = await jsonDb.save({
          ...saved,
          public_key: wallet.public_key,
          encrypted_private_key: wallet.encrypted_private_key,
          encrypted_agent_key: wallet.encrypted_agent_key,
        });
        return `Agent created with wallet.\nAgent ID: ${withWallet.id}\nMax Spend: ${withWallet.max_spend} SOL\nPublic Key: ${withWallet.public_key}`;
      }
      if (!agentId) throw new Error('No agent selected');
      if (name === 'create_wallet') {
        const agent = await jsonDb.findOne({ where: { id: agentId } });
        if (!agent) throw new Error('Agent not found');
        const wallet = this.createWalletInline(cryptoService);
        const updated = await jsonDb.save({
          ...agent,
          public_key: wallet.public_key,
          encrypted_private_key: wallet.encrypted_private_key,
          encrypted_agent_key: wallet.encrypted_agent_key,
        });
        return `Wallet created successfully!\nPublic Key: ${updated.public_key}`;
      }
      if (name === 'get_balance') {
        const agent = await jsonDb.findOne({ where: { id: agentId } });
        if (!agent || !agent.public_key) throw new Error('Agent not found or no wallet');
        const lamports = await connection.getBalance(new PublicKey(agent.public_key));
        const sol = lamports / LAMPORTS_PER_SOL;
        return `Balance: ${sol} SOL (${lamports} lamports)`;
      }
      if (name === 'get_wallet_address') {
        const agent = await jsonDb.findOne({ where: { id: agentId } });
        if (!agent || !agent.public_key) throw new Error('Agent not found or no wallet');
        return `Wallet Address: ${agent.public_key}`;
      }
      if (name === 'transfer_sol') {
        const agent = await jsonDb.findOne({ where: { id: agentId } });
        if (!agent) throw new Error('Agent not found');
        const amount = Number(args?.amount ?? 0);
        const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
        const maxSpendLamports = parseFloat(agent.max_spend) * LAMPORTS_PER_SOL;
        if (lamports > maxSpendLamports) {
          return `Transfer blocked: Amount ${amount} SOL exceeds max_spend limit of ${agent.max_spend} SOL`;
        }
        const fromPubkey = agent.public_key;
        if (!fromPubkey) throw new Error('Agent has no wallet. Create a wallet first.');
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(fromPubkey),
            toPubkey: new PublicKey(String(args?.recipientAddress ?? '')),
            lamports,
          }),
        );
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new PublicKey(fromPubkey);
        const masterKey = Buffer.from(process.env.MASTER_KEY || '', 'hex');
        const aekHex = cryptoService.decrypt(agent.encrypted_agent_key!, masterKey);
        const aek = Buffer.from(aekHex, 'hex');
        const privateKeyHex = cryptoService.decrypt(agent.encrypted_private_key!, aek);
        const keypair = Keypair.fromSecretKey(Buffer.from(privateKeyHex, 'hex'));
        const sim = await connection.simulateTransaction(transaction);
        if (sim.value.err) throw new Error(`Simulation failed: ${JSON.stringify(sim.value.err)}`);
        transaction.sign(keypair);
        const signature = await connection.sendRawTransaction(transaction.serialize());
        return `Transfer successful!\nAmount: ${amount} SOL\nTo: ${args?.recipientAddress}\nSignature: ${signature}`;
      }
      if (name === 'request_airdrop') {
        const agent = await jsonDb.findOne({ where: { id: agentId } });
        if (!agent?.public_key) throw new Error('Agent not found or no wallet');
        const amount = Math.min(2, Math.max(0.1, Number(args?.amount ?? 0.5)));
        const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
        const rpcUrl = 'https://api.devnet.solana.com';
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'requestAirdrop',
            params: [agent.public_key, lamports],
          }),
        });
        const data = (await res.json()) as { result?: string; error?: { code: number; message: string } };
        if (data.error) {
          const msg = data.error.message ?? '';
          if (msg.includes('limit') || msg.includes('429') || data.error.code === -32600) {
            throw new Error(
              `Airdrop rejected (rate limit or quota). Try again in 8+ hours or use a different network. ${msg}`,
            );
          }
          throw new Error(data.error.message ?? 'Airdrop failed');
        }
        const signature = data.result;
        if (!signature) throw new Error('No signature in airdrop response');
        const airdropConn = new Connection(rpcUrl, 'confirmed');
        const latestBlockHash = await airdropConn.getLatestBlockhash();
        await airdropConn.confirmTransaction({
          signature,
          blockhash: latestBlockHash.blockhash,
          lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        });
        return `Airdrop successful!\nAmount: ${amount} SOL (Devnet)\nSignature: ${signature}\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`;
      }
      if (name === 'get_assets_by_owner') {
        const apiKey = process.env.HELIUS_API_KEY;
        if (!apiKey) throw new Error('HELIUS_API_KEY is not set');
        const helius = createHelius({ apiKey });
        const ownerAddress = String(args?.ownerAddress ?? '');
        const page = Number(args?.page ?? 1);
        const limit = Number(args?.limit ?? 50);
        const result = await helius.getAssetsByOwner({
          ownerAddress,
          page,
          limit,
          sortBy: { sortBy: 'created', sortDirection: 'asc' },
          displayOptions: { showFungible: true, showNativeBalance: false },
        });
        const items = (result as { items?: unknown[] })?.items ?? [];
        const tokens = items
          .filter(
            (a: { interface?: string; id?: string }) =>
              (a.interface === 'FungibleToken' || a.interface === 'FungibleAsset') && a.id !== SOL_MINT
          )
          .map((a: { id?: string; content?: { metadata?: { symbol?: string; name?: string } } }) => ({
            mint: a.id,
            symbol: a.content?.metadata?.symbol ?? '',
            name: a.content?.metadata?.name ?? '',
          }));
        return `Assets (fungible tokens):\n${JSON.stringify(tokens, null, 2)}`;
      }
      if (name === 'buy_token') {
        const jupiterKey = process.env.JUPITER_API_KEY;
        if (!jupiterKey) throw new Error('JUPITER_API_KEY is not set. Get a key at portal.jup.ag');
        const agent = await jsonDb.findOne({ where: { id: agentId } });
        if (!agent?.public_key) throw new Error('Agent not found or no wallet');
        const mintAddress = String(args?.mintAddress ?? '').trim();
        const amountSol = Math.max(0.001, Math.min(10, Number(args?.amountSol ?? 0.1)));
        const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
        const maxSpendLamports = parseFloat(agent.max_spend) * LAMPORTS_PER_SOL;
        if (lamports > maxSpendLamports) {
          return `Buy blocked: ${amountSol} SOL exceeds max_spend ${agent.max_spend} SOL`;
        }
        if (mintAddress === SOL_MINT) {
          return 'Cannot buy native SOL; use transfer_sol or request_airdrop instead.';
        }
        const jupiterHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-api-key': jupiterKey,
        };
        const quoteRes = await fetch(
          `${JUPITER_QUOTE}?inputMint=${SOL_MINT}&outputMint=${encodeURIComponent(mintAddress)}&amount=${lamports}&slippageBps=100`,
          { headers: jupiterHeaders }
        );
        if (!quoteRes.ok) {
          const err = await quoteRes.text();
          throw new Error(`Jupiter quote failed: ${err}`);
        }
        const quote = (await quoteRes.json()) as Record<string, unknown>;
        const swapRes = await fetch(JUPITER_SWAP, {
          method: 'POST',
          headers: jupiterHeaders,
          body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: agent.public_key,
            wrapAndUnwrapSol: true,
          }),
        });
        if (!swapRes.ok) {
          const err = await swapRes.text();
          throw new Error(`Jupiter swap build failed: ${err}`);
        }
        const swapData = (await swapRes.json()) as { swapTransaction?: string };
        const swapTxB64 = swapData.swapTransaction;
        if (!swapTxB64) throw new Error('No swapTransaction in Jupiter response');
        const txBuf = Buffer.from(swapTxB64, 'base64');
        const transaction = Transaction.from(txBuf);
        const masterKey = Buffer.from(process.env.MASTER_KEY || '', 'hex');
        const aekHex = cryptoService.decrypt(agent.encrypted_agent_key!, masterKey);
        const aek = Buffer.from(aekHex, 'hex');
        const privateKeyHex = cryptoService.decrypt(agent.encrypted_private_key!, aek);
        const keypair = Keypair.fromSecretKey(Buffer.from(privateKeyHex, 'hex'));
        transaction.sign(keypair);
        const signature = await connection.sendRawTransaction(transaction.serialize());
        return `Buy successful!\nSpent: ${amountSol} SOL for token ${mintAddress}\nSignature: ${signature}`;
      }
      return `Unknown tool: ${name}`;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[${name}]`, error);
      return `Failed: ${errMsg}`;
    }
  }

  async chat(
    agentId: string | undefined,
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ): Promise<{ messages: string[] }> {
    const app = getApp();
    const jsonDb = app.get(JsonDbService);
    const cryptoService = app.get(CryptoService);

    let agent: Agent | null = null;
    if (agentId) {
      agent = await jsonDb.findOne({ where: { id: agentId } });
    }

    const systemInstruction =
      agentId && agent
        ? `You are an AI agent managing a Solana wallet. Your agent ID is ${agentId}.\n` +
          `You can create wallets, check balances, view addresses, transfer SOL, request a Devnet airdrop, get tokens owned by an address (get_assets_by_owner), and buy SPL tokens with SOL (buy_token).\n` +
          `To buy each token an owner holds: first call get_assets_by_owner with their address, then for each fungible token mint returned call buy_token with that mint and amountSol (e.g. 0.1).\n` +
          `When you ask for confirmation (e.g. "Please confirm if you want to proceed"), and the user confirms (e.g. "yes", "go ahead", "confirm", "do it"), execute the action immediately with the details you already stated.\n` +
          `Always confirm transaction details before executing transfers. Your maximum spend limit is ${agent.max_spend} SOL. Never exceed this amount.`
        : `You are an AI assistant helping users set up their Solana wallet agent.\n` +
          `Currently, no agent exists. You can help users create a new agent with a specified max spend limit.\n` +
          `Use the create_agent tool when the user wants to create an agent.`;

    const functionDeclarations = agentId
      ? [
          this.createWalletTool,
          this.getBalanceTool,
          this.getWalletAddressTool,
          this.transferSolTool,
          this.requestAirdropTool,
          this.getAssetsByOwnerTool,
          this.buyTokenTool,
        ]
      : [this.createAgentTool];

    const recent = history.slice(-20);
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const m of recent) {
      if (m.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: m.content }] });
      } else {
        contents.push({ role: 'model', parts: [{ text: m.content }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const result = await this.genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        tools: [{ functionDeclarations }],
        maxOutputTokens: 5000,
        temperature: 1,
        systemInstruction,
      },
    });

    const candidate = (result as { candidates?: Array<{ content?: { parts: Array<{ text?: string; functionCall?: { name: string; args?: Record<string, unknown> } }> } }> }).candidates?.[0];
    const parts = candidate?.content?.parts ?? [];

    const responseText = parts
      .filter((p: { text?: string }) => typeof p.text === 'string')
      .map((p: { text?: string }) => p.text)
      .join('')
      .trim();

    let acknowledgement = '';
    for (const part of parts) {
      const fc = (part as { functionCall?: { name: string; args?: Record<string, unknown> } }).functionCall;
      if (fc?.name) {
        const toolResult = await this.executeTool(fc.name, fc.args ?? {}, agentId, { jsonDb, cryptoService });
        acknowledgement += toolResult + '\n\n';
      }
    }

    const fullResponse = (acknowledgement + responseText).trim();
    return { messages: [JSON.stringify({ result: fullResponse })] };
  }
}
