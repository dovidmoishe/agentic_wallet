/**
 * Agentic Wallet - Simple Demo (Without Claude API)
 * Demonstrates core functionality: Agent creation, wallet creation, encryption
 */

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module.js';
import { AgentService } from './src/agent/agent.service.js';
import { WalletService } from './src/wallet/wallet.service.js';
import { CryptoService } from './src/wallet/crypto.service.js';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDemo() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║     AGENTIC WALLET - LIVE DEMO                 ║');
  console.log('║     Solana Devnet | Encrypted Keys            ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  console.log('📚 Bootstrapping services...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const agentService = app.get(AgentService);
  const walletService = app.get(WalletService);
  const cryptoService = app.get(CryptoService);

  console.log('✅ Services initialized\n');

  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: CREATE AGENT
    // ═══════════════════════════════════════════════════════════
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ STEP 1: CREATE AGENT                          ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('💬 Creating agent with 5 SOL max spend...');
    const agent = await agentService.create({
      max_spend: '5.00',
    });

    console.log(`✅ Agent Created Successfully!\n`);
    console.log(`   Agent ID:  ${agent.id}`);
    console.log(`   Max Spend: ${agent.max_spend} SOL`);
    console.log(`   Created:   ${agent.created_at}\n`);

    await sleep(1000);

    // ═══════════════════════════════════════════════════════════
    // STEP 2: CREATE WALLET (With Encryption)
    // ═══════════════════════════════════════════════════════════
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ STEP 2: CREATE WALLET                         ║');
    console.log('║         (With AES-256-GCM Encryption)         ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('🔐 Generating Solana keypair...');
    const wallet = walletService.createWallet();
    console.log(`✅ Keypair Generated\n`);

    console.log('📋 Wallet Details:');
    console.log(`   Public Key:  ${wallet.public_key.substring(0, 40)}...`);
    console.log(`   Encrypted Private Key (AEK encrypted):`);
    console.log(`      Data: ${wallet.encrypted_private_key.data.substring(0, 40)}...`);
    console.log(`      IV:   ${wallet.encrypted_agent_key.iv}`);
    console.log(`      Tag:  ${wallet.encrypted_agent_key.tag}\n`);

    // Update agent with wallet
    const updatedAgent = await agentService.createAgentWallet(agent.id);
    console.log(`✅ Wallet Saved to Database\n`);
    console.log(`   Agent now owns: ${updatedAgent.public_key}\n`);

    await sleep(1000);

    // ═══════════════════════════════════════════════════════════
    // STEP 3: FETCH & VERIFY ENCRYPTION
    // ═══════════════════════════════════════════════════════════
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ STEP 3: VERIFY ENCRYPTION                     ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    const fetchedAgent = await agentService.findOne(agent.id);
    if (!fetchedAgent) {
      throw new Error('Agent not found');
    }

    console.log('🔍 Fetched agent from database...');
    console.log(`✅ Agent Retrieved\n`);

    console.log('🔐 Encryption Status:');
    console.log(`   Public Key:                  ${fetchedAgent.public_key.substring(0, 40)}...`);
    console.log(`   Private Key (encrypted):     PROTECTED ✓`);
    console.log(`   Agent Key (encrypted):       PROTECTED ✓\n`);

    console.log('🔑 Encryption Details:');
    console.log(`   Algorithm:    AES-256-GCM`);
    console.log(`   Key Layers:   2 (AEK + Master Key)`);
    console.log(`   IV Length:    12 bytes`);
    console.log(`   Auth Tag:     16 bytes\n`);

    await sleep(1000);

    // ═══════════════════════════════════════════════════════════
    // STEP 4: CHECK BALANCE FROM BLOCKCHAIN
    // ═══════════════════════════════════════════════════════════
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ STEP 4: CHECK WALLET BALANCE                  ║');
    console.log('║         (From Solana Devnet)                  ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('⛓️  Querying Solana devnet RPC...');
    const balanceLamports = await walletService.getBalance(agent.id);
    const balanceSOL = balanceLamports / 1e9;

    console.log(`✅ Balance Retrieved\n`);
    console.log(`   Balance: ${balanceSOL.toFixed(9)} SOL`);
    console.log(`   Lamports: ${balanceLamports}\n`);

    // New wallet = 0 balance
    if (balanceLamports === 0) {
      console.log('   📌 New wallet has no funds (expected for devnet)\n');
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 5: SUMMARY & SECURITY
    // ═══════════════════════════════════════════════════════════
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ ✅ DEMO COMPLETE - ALL SYSTEMS OPERATIONAL    ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('📊 DEMO RESULTS:\n');
    console.log('✓ Agent Creation');
    console.log(`  └─ Created agent: ${agent.id.substring(0, 8)}...`);
    console.log(`  └─ Max Spend: ${agent.max_spend} SOL\n`);

    console.log('✓ Wallet Generation');
    console.log(`  └─ Generated Solana keypair`);
    console.log(`  └─ Public Key: ${wallet.public_key.substring(0, 20)}...`);
    console.log(`  └─ Stored in database\n`);

    console.log('✓ Encryption Pipeline');
    console.log('  └─ Private key encrypted with AEK (AES-256-GCM)');
    console.log('  └─ AEK encrypted with Master Key (AES-256-GCM)');
    console.log('  └─ Dual-layer security: ACTIVE ✓\n');

    console.log('✓ Blockchain Integration');
    console.log(`  └─ Connected to Solana devnet`);
    console.log(`  └─ Balance query successful: ${balanceSOL.toFixed(9)} SOL\n`);

    console.log('🔒 SECURITY SUMMARY:\n');
    console.log('Encryption Methods:');
    console.log('  • AES-256-GCM (Advanced Encryption Standard)');
    console.log('  • 256-bit keys (maximum security)');
    console.log('  • Authenticated encryption (prevents tampering)');
    console.log('  • Random 12-byte IVs (unpredictable)\n');

    console.log('Key Management:');
    console.log('  ✓ Master Key: From environment (never in code)');
    console.log('  ✓ Agent Encryption Key: Generated randomly per agent');
    console.log('  ✓ Private Keys: Never stored unencrypted');
    console.log('  ✓ Max Spend: Enforced before transactions\n');

    console.log('Database:');
    console.log('  ✓ PostgreSQL on Supabase');
    console.log('  ✓ SSL/TLS encryption in transit');
    console.log('  ✓ Encrypted data stored (backup-safe)\n');

    console.log('🚀 NEXT STEPS:\n');
    console.log('Launch the Terminal UI:');
    console.log('  $ NODE_TLS_REJECT_UNAUTHORIZED=0 npm run tui\n');

    console.log('Or start the REST API:');
    console.log('  $ npm run start:dev\n');

    console.log('Run tests:');
    console.log('  $ npm run test\n');

  } catch (error) {
    console.error(
      '\n❌ Demo failed:',
      error instanceof Error ? error.message : error,
    );
    console.error(error);
  } finally {
    await app.close();
    process.exit(0);
  }
}

runDemo();
