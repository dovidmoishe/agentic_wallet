import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONFIG_FILE = '.agent-config.json';

interface AgentConfig {
  agentId: string;
}

export function getConfigPath(): string {
  return join(process.cwd(), CONFIG_FILE);
}

export function loadAgentConfig(): string | null {
  const configPath = getConfigPath();
  
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const config: AgentConfig = JSON.parse(content);
    return config.agentId || null;
  } catch (error) {
    return null;
  }
}

export function saveAgentConfig(agentId: string): void {
  const configPath = getConfigPath();
  const config: AgentConfig = { agentId };
  
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export function clearAgentConfig(): void {
  const configPath = getConfigPath();
  
  if (existsSync(configPath)) {
    writeFileSync(configPath, JSON.stringify({}, null, 2), 'utf-8');
  }
}
