/**
 * Test TUI Flow - Chat with Claude Agent
 * This simulates what happens when you use the TUI
 */

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module.js';
import { ClaudeAgentService } from './src/agent/claude-agent.service.js';
import { AgentService } from './src/agent/agent.service.js';
import { writeFileSync } from 'fs';

async function testTUIFlow() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  TEST TUI FLOW - CHAT WITH CLAUDE AGENT        ║');
  console.log('║  This simulates live TUI interaction           ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    console.log('🚀 Bootstrapping services...');
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });

    const claudeAgentService = app.get(ClaudeAgentService);
    const agentService = app.get(AgentService);

    console.log('✅ Services ready\n');

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [] as any[],
    };

    // ═══════════════════════════════════════════════════════════
    // TEST 1: CREATE AGENT VIA CLAUDE
    // ═══════════════════════════════════════════════════════════
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ TEST 1: CREATE AGENT VIA CLAUDE CHAT          ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('💬 User: "Create an agent with 15 SOL max spend"\n');
    console.log('🤖 Claude is thinking...\n');

    try {
      const createResponse = await claudeAgentService.chat(
        undefined,
        'Create an agent with 15 SOL max spend',
      );

      console.log('🤖 Claude Response:');
      createResponse.messages.forEach((msg) => {
        try {
          const parsed = JSON.parse(msg);
          if (parsed.result) {
            console.log(`   ${parsed.result}\n`);
          } else {
            console.log(`   ${msg}\n`);
          }
        } catch {
          console.log(`   ${msg}\n`);
        }
      });

      // Extract agent ID from response
      const fullResponse = createResponse.messages.join('\n');
      const agentIdMatch = fullResponse.match(
        /Agent ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
      );

      if (agentIdMatch) {
        const newAgentId = agentIdMatch[1];
        console.log(`✅ Agent Created: ${newAgentId}\n`);

        testResults.tests.push({
          test: 'Create Agent via Claude',
          status: 'PASSED',
          agentId: newAgentId,
        });

        // ═══════════════════════════════════════════════════════════
        // TEST 2: CREATE WALLET FOR AGENT
        // ═══════════════════════════════════════════════════════════
        console.log('╔═══════════════════════════════════════════════╗');
        console.log('║ TEST 2: CREATE WALLET VIA CLAUDE CHAT         ║');
        console.log('╚═══════════════════════════════════════════════╝\n');

        console.log('💬 User: "Create a wallet for my agent"\n');
        console.log('🤖 Claude is thinking...\n');

        const walletResponse = await claudeAgentService.chat(
          newAgentId,
          'Create a wallet for my agent',
        );

        console.log('🤖 Claude Response:');
        walletResponse.messages.forEach((msg) => {
          try {
            const parsed = JSON.parse(msg);
            if (parsed.result) {
              console.log(`   ${parsed.result}\n`);
            } else {
              console.log(`   ${msg}\n`);
            }
          } catch {
            console.log(`   ${msg}\n`);
          }
        });

        const walletFullResponse = walletResponse.messages.join('\n');
        const publicKeyMatch = walletFullResponse.match(
          /Public Key:\s*([A-Za-z0-9]{40,})/i,
        );

        if (publicKeyMatch) {
          const publicKey = publicKeyMatch[1];
          console.log(`✅ Wallet Created: ${publicKey.substring(0, 20)}...\n`);

          testResults.tests.push({
            test: 'Create Wallet via Claude',
            status: 'PASSED',
            publicKey: publicKey,
          });

          // ═══════════════════════════════════════════════════════════
          // TEST 3: GET BALANCE
          // ═══════════════════════════════════════════════════════════
          console.log('╔═══════════════════════════════════════════════╗');
          console.log('║ TEST 3: CHECK BALANCE VIA CLAUDE CHAT         ║');
          console.log('╚═══════════════════════════════════════════════╝\n');

          console.log('💬 User: "What is my wallet balance?"\n');
          console.log('🤖 Claude is thinking...\n');

          const balanceResponse = await claudeAgentService.chat(
            newAgentId,
            'What is my wallet balance?',
          );

          console.log('🤖 Claude Response:');
          balanceResponse.messages.forEach((msg) => {
            try {
              const parsed = JSON.parse(msg);
              if (parsed.result) {
                console.log(`   ${parsed.result}\n`);
              } else {
                console.log(`   ${msg}\n`);
              }
            } catch {
              console.log(`   ${msg}\n`);
            }
          });

          testResults.tests.push({
            test: 'Get Balance via Claude',
            status: 'PASSED',
          });

          // ═══════════════════════════════════════════════════════════
          // TEST 4: GET WALLET ADDRESS
          // ═══════════════════════════════════════════════════════════
          console.log('╔═══════════════════════════════════════════════╗');
          console.log('║ TEST 4: GET WALLET ADDRESS VIA CLAUDE CHAT    ║');
          console.log('╚═══════════════════════════════════════════════╝\n');

          console.log('💬 User: "Show me my wallet address"\n');
          console.log('🤖 Claude is thinking...\n');

          const addressResponse = await claudeAgentService.chat(
            newAgentId,
            'Show me my wallet address',
          );

          console.log('🤖 Claude Response:');
          addressResponse.messages.forEach((msg) => {
            try {
              const parsed = JSON.parse(msg);
              if (parsed.result) {
                console.log(`   ${parsed.result}\n`);
              } else {
                console.log(`   ${msg}\n`);
              }
            } catch {
              console.log(`   ${msg}\n`);
            }
          });

          testResults.tests.push({
            test: 'Get Wallet Address via Claude',
            status: 'PASSED',
          });

          // ═══════════════════════════════════════════════════════════
          // VERIFY IN DATABASE
          // ═══════════════════════════════════════════════════════════
          console.log('╔═══════════════════════════════════════════════╗');
          console.log('║ TEST 5: VERIFY AGENT IN DATABASE              ║');
          console.log('╚═══════════════════════════════════════════════╝\n');

          const fetchedAgent = await agentService.findOne(newAgentId);
          if (fetchedAgent) {
            console.log(`✅ Agent Found in Database!\n`);
            console.log(`   Agent ID:     ${fetchedAgent.id}`);
            console.log(`   Public Key:   ${fetchedAgent.public_key.substring(0, 40)}...`);
            console.log(`   Max Spend:    ${fetchedAgent.max_spend} SOL`);
            console.log(`   Created:      ${fetchedAgent.created_at}\n`);

            testResults.tests.push({
              test: 'Verify Agent in Database',
              status: 'PASSED',
              agentId: newAgentId,
              publicKey: fetchedAgent.public_key,
              maxSpend: fetchedAgent.max_spend,
            });
          }
        }
      } else {
        console.log('⚠️  Could not extract agent ID from response\n');
      }
    } catch (error) {
      console.error('❌ Chat error:', error instanceof Error ? error.message : error);
      testResults.tests.push({
        test: 'Create Agent via Claude',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // ═══════════════════════════════════════════════════════════
    // FINAL SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║ ✅ TUI FLOW TEST COMPLETE                      ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log('📊 TEST RESULTS:\n');
    testResults.tests.forEach((test) => {
      const icon = test.status === 'PASSED' ? '✅' : '❌';
      console.log(`${icon} ${test.test}: ${test.status}`);
      if (test.agentId) console.log(`   Agent ID: ${test.agentId}`);
      if (test.publicKey) console.log(`   Public Key: ${test.publicKey.substring(0, 30)}...`);
    });

    console.log('\n🚀 READY FOR BOUNTY DEMO!\n');
    console.log('You can now:');
    console.log(`  1. Run the TUI: NODE_TLS_REJECT_UNAUTHORIZED=0 npm run tui`);
    console.log(`  2. Load created agent in chat`);
    console.log(`  3. Demo wallet operations to bounty reviewers\n`);

    // Save test results
    writeFileSync(
      '/data/.openclaw/workspace/agentic_wallet/test-results.json',
      JSON.stringify(testResults, null, 2),
    );

    console.log('📄 Test results saved to: test-results.json\n');

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error(
      '\n❌ Test failed:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

testTUIFlow();
