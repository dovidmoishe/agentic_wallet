/**
 * Create Agent in Database - Real Demo
 * This WILL save to your Supabase database
 */

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module.js';
import { AgentService } from './src/agent/agent.service.js';
import { WalletService } from './src/wallet/wallet.service.js';

async function createAgentDemo() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  CREATE AGENT IN DATABASE - REAL DEMO          ║');
  console.log('║  This will save to your Supabase database      ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    console.log('🚀 Bootstrapping NestJS & Database...');
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });

    const agentService = app.get(AgentService);
    const walletService = app.get(WalletService);

    console.log('✅ Connected to Database\n');

    // ═══════════════════════════════════════════════════════════
    // STEP 1: CREATE AGENT
    // ═══════════════════════════════════════════════════════════
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ STEP 1: CREATE AGENT                          ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('💬 Creating agent with 10 SOL max spend...');
    const agent = await agentService.create({
      max_spend: '10.00',
    });

    console.log(`✅ Agent Created & Saved to Database!\n`);
    console.log(`   Agent ID:  ${agent.id}`);
    console.log(`   Max Spend: ${agent.max_spend} SOL`);
    console.log(`   Created:   ${agent.created_at}\n`);

    // ═══════════════════════════════════════════════════════════
    // STEP 2: CREATE WALLET FOR AGENT
    // ═══════════════════════════════════════════════════════════
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ STEP 2: CREATE WALLET                         ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('🔐 Generating Solana keypair...');
    const wallet = walletService.createWallet();
    console.log(`✅ Keypair Generated\n`);

    console.log('📝 Saving wallet to agent...');
    const agentWithWallet = await agentService.createAgentWallet(agent.id);
    console.log(`✅ Wallet Saved!\n`);
    console.log(`   Public Key: ${agentWithWallet.public_key.substring(0, 40)}...`);
    console.log(`   Encrypted:  ✓\n`);

    // ═══════════════════════════════════════════════════════════
    // STEP 3: VERIFY IN DATABASE
    // ═══════════════════════════════════════════════════════════
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ STEP 3: VERIFY IN DATABASE                    ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('🔍 Fetching agent from database...');
    const fetchedAgent = await agentService.findOne(agent.id);

    if (!fetchedAgent) {
      console.log('❌ FAILED: Agent not found in database!');
      process.exit(1);
    }

    console.log(`✅ Agent Retrieved from Database!\n`);
    console.log(`   Agent ID:     ${fetchedAgent.id}`);
    console.log(`   Public Key:   ${fetchedAgent.public_key.substring(0, 40)}...`);
    console.log(`   Max Spend:    ${fetchedAgent.max_spend} SOL`);
    console.log(`   Created:      ${fetchedAgent.created_at}\n`);

    // ═══════════════════════════════════════════════════════════
    // FINAL SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║ ✅ SUCCESS - AGENT CREATED & VERIFIED          ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log('📊 SUMMARY:\n');
    console.log(`✓ Agent ID:    ${agent.id}`);
    console.log(`✓ Wallet:      ${agentWithWallet.public_key}`);
    console.log(`✓ Max Spend:   ${agent.max_spend} SOL`);
    console.log(`✓ Database:    ✅ SAVED\n`);

    console.log('🎯 NEXT STEPS:\n');
    console.log(`1. Check your database for agent: ${agent.id}`);
    console.log(`2. Run locally: NODE_TLS_REJECT_UNAUTHORIZED=0 npm run tui`);
    console.log(`3. Ask Claude to check balance on your wallet\n`);

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error(
      '\n❌ Demo failed:',
      error instanceof Error ? error.message : error,
    );
    console.error(error);
    process.exit(1);
  }
}

createAgentDemo();
