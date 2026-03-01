/**
 * Create Agent in Database - Direct SQL Approach
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Agent } from './src/agent/entities/agent.entity.js';
import { randomBytes } from 'crypto';
import { Keypair } from '@solana/web3.js';
import { createCipheriv } from 'crypto';

// Encryption function
function encrypt(data: string, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return { data: encrypted, iv: iv.toString('hex'), tag: tag.toString('hex') };
}

async function createAgent() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  CREATE AGENT IN DATABASE - REAL DEMO          ║');
  console.log('║  This will save to your Supabase database      ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    console.log('🔌 Connecting to Supabase...');
    
    const AppDataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Agent],
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      synchronize: false,
      logging: false,
    });

    await AppDataSource.initialize();
    console.log('✅ Connected!\n');

    const agentRepository = AppDataSource.getRepository(Agent);

    // ═══════════════════════════════════════════════════════════
    // STEP 1: CREATE AGENT
    // ═══════════════════════════════════════════════════════════
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ STEP 1: CREATE AGENT                          ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('💬 Creating agent with 10 SOL max spend...');
    const maxSpend = '10.00';

    // Generate wallet
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const privateKeyHex = Buffer.from(keypair.secretKey).toString('hex');

    // Encrypt wallet
    const aek = randomBytes(32);
    const masterKey = Buffer.from(process.env.MASTER_KEY || '', 'hex');

    const encryptedPrivateKey = encrypt(privateKeyHex, aek);
    const encryptedAek = encrypt(aek.toString('hex'), masterKey);

    // Create agent with encrypted wallet
    const agent = agentRepository.create({
      max_spend: maxSpend,
      public_key: publicKey,
      encrypted_private_key: encryptedPrivateKey,
      encrypted_agent_key: encryptedAek,
    });

    const savedAgent = await agentRepository.save(agent);

    console.log(`✅ Agent Created & Saved to Database!\n`);
    console.log(`   Agent ID:  ${savedAgent.id}`);
    console.log(`   Max Spend: ${savedAgent.max_spend} SOL`);
    console.log(`   Public Key: ${publicKey.substring(0, 20)}...`);
    console.log(`   Created:   ${savedAgent.created_at}\n`);

    // ═══════════════════════════════════════════════════════════
    // STEP 2: VERIFY IN DATABASE
    // ═══════════════════════════════════════════════════════════
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ STEP 2: VERIFY IN DATABASE                    ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('🔍 Fetching agent from database...');
    const fetchedAgent = await agentRepository.findOne({
      where: { id: savedAgent.id },
    });

    if (!fetchedAgent) {
      console.log('❌ FAILED: Agent not found!');
      process.exit(1);
    }

    console.log(`✅ Agent Retrieved from Database!\n`);
    console.log(`   Agent ID:     ${fetchedAgent.id}`);
    console.log(`   Max Spend:    ${fetchedAgent.max_spend} SOL`);
    console.log(`   Public Key:   ${fetchedAgent.public_key.substring(0, 40)}...`);
    console.log(`   Created:      ${fetchedAgent.created_at}`);
    console.log(`   Encrypted:    ✓\n`);

    // ═══════════════════════════════════════════════════════════
    // FINAL SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║ ✅ SUCCESS - AGENT CREATED & VERIFIED          ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log('📊 SUMMARY:\n');
    console.log(`✓ Agent ID:    ${savedAgent.id}`);
    console.log(`✓ Public Key:  ${publicKey}`);
    console.log(`✓ Max Spend:   ${savedAgent.max_spend} SOL`);
    console.log(`✓ Database:    ✅ SAVED & VERIFIED\n`);

    console.log('🎯 NEXT STEPS:\n');
    console.log(`1. Check your Supabase database for this agent:`);
    console.log(`   SELECT * FROM agents WHERE id = '${savedAgent.id}';\n`);
    console.log(`2. Run the TUI locally:`);
    console.log(`   NODE_TLS_REJECT_UNAUTHORIZED=0 npm run tui\n`);
    console.log(`3. The agent will load automatically when you start TUI\n`);

    await AppDataSource.destroy();
    process.exit(0);

  } catch (error) {
    console.error(
      '\n❌ Failed:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

createAgent();
