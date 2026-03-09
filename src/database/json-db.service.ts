import { Injectable } from '@nestjs/common';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { Agent } from '../agent/entities/agent.entity.js';

interface StoredAgent extends Omit<Agent, 'created_at'> {
  created_at: string;
}

interface JsonDatabase {
  agents: StoredAgent[];
}

@Injectable()
export class JsonDbService {
  private readonly dataPath: string;
  private readonly dataDir: string;

  constructor() {
    this.dataDir = join(process.cwd(), 'data');
    this.dataPath = join(this.dataDir, 'agents.json');
  }

  private ensureDataFile(): void {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
    if (!existsSync(this.dataPath)) {
      writeFileSync(this.dataPath, JSON.stringify({ agents: [] }, null, 2), 'utf-8');
    }
  }

  private load(): Agent[] {
    this.ensureDataFile();
    const raw = readFileSync(this.dataPath, 'utf-8');
    let data: JsonDatabase;
    try {
      data = JSON.parse(raw || '{"agents":[]}');
    } catch {
      data = { agents: [] };
    }
    return (data.agents || []).map((a) => ({
      ...a,
      created_at: new Date(a.created_at),
    })) as Agent[];
  }

  private persist(agents: Agent[]): void {
    this.ensureDataFile();
    const stored: StoredAgent[] = agents.map((a) => ({
      ...a,
      created_at: a.created_at instanceof Date ? a.created_at.toISOString() : (a.created_at as unknown as string),
    }));
    writeFileSync(this.dataPath, JSON.stringify({ agents: stored }, null, 2), 'utf-8');
  }

  find(): Promise<Agent[]> {
    return Promise.resolve(this.load());
  }

  findOne(options: { where: Partial<Agent> }): Promise<Agent | null> {
    const agents = this.load();
    const where = options.where;
    const found = agents.find((a) => {
      if (where.id != null && a.id !== where.id) return false;
      if (where.public_key != null && a.public_key !== where.public_key) return false;
      return true;
    });
    return Promise.resolve(found ?? null);
  }

  findOneBy(where: Partial<Agent>): Promise<Agent | null> {
    return this.findOne({ where });
  }

  create(partial: Partial<Agent>): Agent {
    return {
      ...partial,
      id: partial.id ?? randomUUID(),
      created_at: (partial.created_at as Date) ?? new Date(),
      public_key: partial.public_key ?? null,
      encrypted_private_key: partial.encrypted_private_key ?? null,
      encrypted_agent_key: partial.encrypted_agent_key ?? null,
      max_spend: partial.max_spend!,
    } as Agent;
  }

  async save(agent: Agent): Promise<Agent> {
    const agents = this.load();
    const idx = agents.findIndex((a) => a.id === agent.id);
    if (idx >= 0) {
      agents[idx] = agent;
    } else {
      agents.push(agent);
    }
    this.persist(agents);
    return agent;
  }
}
