#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import 'dotenv/config';
import App from './tui/components/App.js';
import { bootstrapServices } from './tui/bootstrap.js';

function fail(msg: string, err?: unknown) {
  const out = err ? `${msg}\n${err instanceof Error ? err.message : String(err)}` : msg;
  process.stdout.write(out + '\n');
  process.exit(1);
}

process.on('unhandledRejection', (reason) => {
  fail('Unhandled rejection:', reason);
});

async function main() {
  process.stdout.write('TUI starting...\n');
  if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
    process.stdin.setRawMode(true);
  }
  
  let services;
  try {
    services = await bootstrapServices();
  } catch (error) {
    fail('Bootstrap failed:', error);
  }

  const { app, claudeAgentService, agentService, walletService } = services;
  process.stdout.write('Rendering TUI...\n');

  try {
    process.stdin.resume();
    process.stdin.on('end', () => {
      console.error('STDIN ended');
    });
    process.stdin.on('close', () => {
      console.error('STDIN closed');
    });
    process.on('SIGINT', () => {
      console.error('SIGINT received');
    });
    const { waitUntilExit } = render(
      <App
        claudeAgentService={claudeAgentService}
        agentService={agentService}
        walletService={walletService}
      />,
      { exitOnCtrlC: false },
    );
    await waitUntilExit();
    await app.close();
    process.exit(0);
  } catch (error) {
    fail('Render error:', error);
    if (services?.app) await services.app.close();
  }
}

main().catch((error) => {
  fail('Failed to start TUI:', error);
});
