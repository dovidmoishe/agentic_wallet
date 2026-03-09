#!/usr/bin/env node
import 'reflect-metadata';
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
  
  let services;
  try {
    services = await bootstrapServices();
  } catch (error) {
    fail('Bootstrap failed:', error);
  }

  const { app, geminiAgentService } = services;
  process.stdout.write('Rendering TUI...\n');

  try {
    const { waitUntilExit } = render(
      <App geminiAgentService={geminiAgentService} />,
      {
        stdin: process.stdin,
        stdout: process.stdout,
        stderr: process.stderr,
      },
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
