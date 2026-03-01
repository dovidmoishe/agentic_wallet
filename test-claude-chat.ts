/**
 * Test Claude Chat - Create Agent via Natural Language
 * This actually tests the TUI chat functionality
 */

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module.js';
import { ClaudeAgentService } from './src/agent/claude-agent.service.js';
import { AgentService } from './src/agent/agent.service.js';

async function testClaudeChat() {
  console.log('\n🤖 Testing Claude Agent Chat...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });

  try {
    const claudeAgentService = app.get(ClaudeAgentService);
    const agentService = app.get(AgentService);

    console.log('💬 User: "Create an agent with 15 SOL max spend"\n');

    const response = await claudeAgentService.chat(
      undefined,
      'Create an agent with 15 SOL max spend'
    );

    console.log('🤖 Claude Response:\n');
    console.log(response.messages.join('\n\n'));
    console.log('\n');

    // Try to extract agent ID
    const fullResponse = response.messages.join('\n');
    const match = fullResponse.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    
    if (match) {
      console.log('✅ Agent ID found:', match[1]);
      
      // Verify in DB
      const agent = await agentService.findOne(match[1]);
      if (agent) {
        console.log('✅ Agent exists in database!');
        console.log('   ID:', agent.id);
        console.log('   Max Spend:', agent.max_spend);
      }
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  } finally {
    await app.close();
    process.exit(0);
  }
}

testClaudeChat();
