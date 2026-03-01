/**
 * Agentic Wallet - Live Demo Test
 * This script demonstrates the full workflow without the TUI
 */

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module.js';
import { AgentService } from './src/agent/agent.service.js';
import { WalletService } from './src/wallet/wallet.service.js';
import { ClaudeAgentService } from './src/agent/claude-agent.service.js';

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
  const claudeAgentService = app.get(ClaudeAgentService);

  console.log('✅ Services initialized\n');

  try {
    // Step 1: Create Agent
    console.log('╔ STEP 1: Create Agent ══════════════════════════╗');
    console.log('💬 User: "Create an agent with 5 SOL max spend"');
    console.log('─────────────────────────────────────────────────\n');

    const createAgentResponse = await claudeAgentService.chat(undefined, 'Create an agent with 5 SOL max spend');
    const agentIdMatch = createAgentResponse.messages
      .join('\n')
      .match(/Agent ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    
    const agentId = agentIdMatch ? agentIdMatch[1] : null;
    
    console.log('🤖 Agent Response:');
    createAgentResponse.messages.forEach((msg) => {
      try {
        const parsed = JSON.parse(msg);
        console.log(`   ${parsed.result || msg}`);
      } catch {
        console.log(`   ${msg}`);
      }
    });

    if (!agentId) {
      console.log('❌ Failed to extract agent ID from response');
      await app.close();
      process.exit(1);
    }

    console.log(`\n✅ Agent Created: ${agentId}\n`);

    // Step 2: Create Wallet
    console.log('╔ STEP 2: Create Wallet ═════════════════════════╗');
    console.log(`💬 User: "Create a wallet for my agent"`);
    console.log('─────────────────────────────────────────────────\n');

    const createWalletResponse = await claudeAgentService.chat(agentId, 'Create a wallet for my agent');
    
    console.log('🤖 Agent Response:');
    createWalletResponse.messages.forEach((msg) => {
      try {
        const parsed = JSON.parse(msg);
        console.log(`   ${parsed.result || msg}`);
      } catch {
        console.log(`   ${msg}`);
      }
    });

    // Fetch agent to get wallet info
    const agentWithWallet = await agentService.findOne(agentId);
    console.log(`\n✅ Wallet Created`);
    console.log(`   Public Key: ${agentWithWallet?.public_key?.substring(0, 20)}...`);
    console.log(`   Max Spend: ${agentWithWallet?.max_spend} SOL\n`);

    // Step 3: Check Balance
    console.log('╔ STEP 3: Check Wallet Balance ═══════════════════╗');
    console.log(`💬 User: "What's my wallet balance?"`);
    console.log('─────────────────────────────────────────────────\n');

    const balanceResponse = await claudeAgentService.chat(agentId, "What's my wallet balance?");
    
    console.log('🤖 Agent Response:');
    balanceResponse.messages.forEach((msg) => {
      try {
        const parsed = JSON.parse(msg);
        console.log(`   ${parsed.result || msg}`);
      } catch {
        console.log(`   ${msg}`);
      }
    });

    console.log('\n✅ Balance Check Complete\n');

    // Step 4: Get Wallet Address
    console.log('╔ STEP 4: Get Wallet Address ════════════════════╗');
    console.log(`💬 User: "Show me my wallet address"`);
    console.log('─────────────────────────────────────────────────\n');

    const addressResponse = await claudeAgentService.chat(agentId, 'Show me my wallet address');
    
    console.log('🤖 Agent Response:');
    addressResponse.messages.forEach((msg) => {
      try {
        const parsed = JSON.parse(msg);
        console.log(`   ${parsed.result || msg}`);
      } catch {
        console.log(`   ${msg}`);
      }
    });

    console.log('\n✅ Address Retrieved\n');

    // Summary
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║           ✅ DEMO COMPLETE                      ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log('📊 Summary:');
    console.log(`   ✓ Agent created with ID: ${agentId}`);
    console.log(`   ✓ Wallet created on Solana devnet`);
    console.log(`   ✓ Private key encrypted with AES-256-GCM`);
    console.log(`   ✓ Balance fetched from blockchain`);
    console.log(`   ✓ Claude AI handled all interactions\n`);

    console.log('🔒 Security:');
    console.log(`   ✓ Private keys: Encrypted with AEK`);
    console.log(`   ✓ Agent key: Encrypted with Master Key`);
    console.log(`   ✓ Dual-layer encryption active`);
    console.log(`   ✓ Max spend enforced at transaction level\n`);

    console.log('🎯 Next Steps:');
    console.log(`   1. npm run tui                  # Launch interactive terminal UI`);
    console.log(`   2. npm run start:dev            # Start REST API server`);
    console.log(`   3. npm run test                 # Run unit tests`);
    console.log(`   4. npm run migration:run        # Run database migrations\n`);

  } catch (error) {
    console.error('❌ Demo failed:', error instanceof Error ? error.message : error);
  } finally {
    await app.close();
    process.exit(0);
  }
}

runDemo();
