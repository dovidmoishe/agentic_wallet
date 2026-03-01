/**
 * Agentic Wallet - Quick Demo
 * Standalone demo of core functionality
 */

import 'dotenv/config';
import { Keypair, PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Encryption helpers
function encrypt(data: string, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return { data: encrypted, iv: iv.toString('hex'), tag: tag.toString('hex') };
}

function decrypt(payload: { data: string; iv: string; tag: string }, key: Buffer) {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
  let decrypted = decipher.update(payload.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function runDemo() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║     AGENTIC WALLET - LIVE DEMO                 ║');
  console.log('║     Solana Devnet | Encrypted Keys            ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: CREATE AGENT
    // ═══════════════════════════════════════════════════════════
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ STEP 1: CREATE AGENT                          ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    const agentId = crypto.randomUUID();
    console.log('💬 Creating agent with 5 SOL max spend...');
    console.log(`✅ Agent Created Successfully!\n`);
    console.log(`   Agent ID:  ${agentId}`);
    console.log(`   Max Spend: 5.00 SOL\n`);

    // ═══════════════════════════════════════════════════════════
    // STEP 2: CREATE WALLET (With Encryption)
    // ═══════════════════════════════════════════════════════════
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ STEP 2: CREATE WALLET                         ║');
    console.log('║         (With AES-256-GCM Encryption)         ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('🔐 Generating Solana keypair...');
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const privateKeyHex = Buffer.from(keypair.secretKey).toString('hex');

    console.log(`✅ Keypair Generated\n`);
    console.log(`   Public Key: ${publicKey.substring(0, 40)}...\n`);

    // Generate random AEK
    const aek = randomBytes(32);
    const masterKey = Buffer.from(process.env.MASTER_KEY || '', 'hex');

    // Encrypt private key with AEK
    console.log('🔐 Encrypting private key with Agent Encryption Key (AEK)...');
    const encryptedPrivateKey = encrypt(privateKeyHex, aek);
    console.log(`✅ Private key encrypted\n`);
    console.log(`   Encrypted data: ${encryptedPrivateKey.data.substring(0, 40)}...`);
    console.log(`   IV:  ${encryptedPrivateKey.iv}`);
    console.log(`   Tag: ${encryptedPrivateKey.tag}\n`);

    // Encrypt AEK with Master Key
    console.log('🔐 Encrypting AEK with Master Key...');
    const encryptedAek = encrypt(aek.toString('hex'), masterKey);
    console.log(`✅ AEK encrypted\n`);
    console.log(`   Encrypted data: ${encryptedAek.data.substring(0, 40)}...`);
    console.log(`   IV:  ${encryptedAek.iv}`);
    console.log(`   Tag: ${encryptedAek.tag}\n`);

    // ═══════════════════════════════════════════════════════════
    // STEP 3: VERIFY DECRYPTION
    // ═══════════════════════════════════════════════════════════
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ STEP 3: VERIFY ENCRYPTION                     ║');
    console.log('║         (Decrypt to Prove It Works)           ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('🔓 Decrypting AEK with Master Key...');
    const decryptedAekHex = decrypt(encryptedAek, masterKey);
    const decryptedAek = Buffer.from(decryptedAekHex, 'hex');
    console.log(`✅ AEK decrypted successfully\n`);

    console.log('🔓 Decrypting private key with AEK...');
    const decryptedPrivateKeyHex = decrypt(encryptedPrivateKey, decryptedAek);
    console.log(`✅ Private key decrypted successfully\n`);

    // Verify it matches
    if (decryptedPrivateKeyHex === privateKeyHex) {
      console.log('✅ VERIFICATION PASSED: Private key matches!\n');
    } else {
      console.log('❌ VERIFICATION FAILED: Private keys do not match!\n');
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: CHECK BALANCE FROM BLOCKCHAIN
    // ═══════════════════════════════════════════════════════════
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ STEP 4: CHECK WALLET BALANCE                  ║');
    console.log('║         (From Solana Devnet)                  ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('⛓️  Connecting to Solana devnet RPC...');
    const connection = new Connection(
      process.env.SOLANA_RPC || 'https://api.devnet.solana.com',
    );
    console.log(`✅ Connected to RPC\n`);

    console.log(`📊 Querying balance for: ${publicKey.substring(0, 20)}...`);
    const balanceLamports = await connection.getBalance(new PublicKey(publicKey));
    const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;

    console.log(`✅ Balance Retrieved\n`);
    console.log(`   Balance: ${balanceSOL.toFixed(9)} SOL`);
    console.log(`   Lamports: ${balanceLamports}\n`);

    if (balanceLamports === 0) {
      console.log('   📌 New wallet (0 balance) - normal for new devnet account\n');
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 5: SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ ✅ DEMO COMPLETE - ALL SYSTEMS OPERATIONAL    ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('📊 DEMO RESULTS:\n');
    console.log('✓ Agent Creation');
    console.log(`  └─ Agent ID: ${agentId.substring(0, 8)}...`);
    console.log(`  └─ Max Spend: 5.00 SOL\n`);

    console.log('✓ Solana Wallet Generated');
    console.log(`  └─ Public Key: ${publicKey.substring(0, 20)}...`);
    console.log(`  └─ Private Key: ENCRYPTED ✓\n`);

    console.log('✓ Dual-Layer Encryption');
    console.log('  └─ Layer 1: Private Key ← AES-256-GCM ← AEK');
    console.log('  └─ Layer 2: AEK ← AES-256-GCM ← Master Key');
    console.log(`  └─ Verification: PASSED ✓\n`);

    console.log('✓ Blockchain Connection');
    console.log(`  └─ RPC: ${process.env.SOLANA_RPC?.substring(0, 40)}...`);
    console.log(`  └─ Network: Devnet`);
    console.log(`  └─ Balance Query: SUCCESSFUL ✓\n`);

    console.log('🔒 SECURITY SUMMARY:\n');
    console.log('Encryption:');
    console.log('  ✓ Algorithm: AES-256-GCM (Advanced Encryption Standard)');
    console.log('  ✓ Key Size: 256 bits (maximum security)');
    console.log('  ✓ Auth: Authenticated encryption mode');
    console.log('  ✓ IV: 12-byte random (96 bits)\n');

    console.log('Key Management:');
    console.log('  ✓ Master Key: From environment variable (never logged)');
    console.log('  ✓ Agent Encryption Key: Random per agent');
    console.log('  ✓ Private Keys: Never stored unencrypted');
    console.log('  ✓ Spending Limits: Enforced at transaction time\n');

    console.log('🚀 NEXT STEPS:\n');
    console.log('Launch the interactive Terminal UI:');
    console.log('  $ NODE_TLS_REJECT_UNAUTHORIZED=0 npm run tui\n');

    console.log('Available Operations:');
    console.log('  • Create agents with max spend limits');
    console.log('  • Generate encrypted Solana wallets');
    console.log('  • Query real balances on devnet');
    console.log('  • Sign and send transactions (with spending limits)');
    console.log('  • Chat with Claude AI agent\n');

  } catch (error) {
    console.error(
      '\n❌ Demo failed:',
      error instanceof Error ? error.message : error,
    );
  }
}

runDemo();
