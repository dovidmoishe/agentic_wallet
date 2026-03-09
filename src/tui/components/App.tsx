import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Connection, PublicKey } from '@solana/web3.js';
import LeftPanel from './LeftPanel.js';
import RightPanel from './RightPanel.js';
import InputPrompt from './InputPrompt.js';
import { GeminiAgentService, getApp } from '../../agent/gemini-agent.service.js';
import { JsonDbService } from '../../database/json-db.service.js';
import { loadAgentConfig, saveAgentConfig } from '../utils/agent-config.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AppProps {
  geminiAgentService: GeminiAgentService;
}

export default function App({ geminiAgentService }: AppProps) {
  const [agentId, setAgentId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [maxSpend, setMaxSpend] = useState<string | null>(null);

  useEffect(() => {
    const loadAgent = async () => {
      const savedAgentId = loadAgentConfig();
      if (savedAgentId) {
        try {
          const jsonDb = getApp().get(JsonDbService);
          const agent = await jsonDb.findOne({ where: { id: savedAgentId } });
          if (agent) {
            setAgentId(savedAgentId);
            setPublicKey(agent.public_key);
            setMaxSpend(agent.max_spend);
            setMessages([
              {
                role: 'assistant',
                content: `Welcome back! Agent ${savedAgentId.substring(0, 8)}... loaded.`,
              },
            ]);
          }
        } catch (error) {
          console.error('Error loading agent:', error);
          setMessages([
            {
              role: 'assistant',
              content: 'Welcome! No agent configured. Ask me to create one for you.',
            },
          ]);
        }
      } else {
        setMessages([
          {
            role: 'assistant',
            content: 'Welcome! No agent configured. Ask me to create one for you.',
          },
        ]);
      }
    };
    loadAgent().catch((error) => {
      console.error('Fatal error in loadAgent:', error);
    });
  }, []);

  useEffect(() => {
    if (!agentId || !publicKey) return;

    const fetchBalance = async () => {
      try {
        const jsonDb = getApp().get(JsonDbService);
        const agent = await jsonDb.findOne({ where: { id: agentId } });
        if (!agent?.public_key) return;
        const connection = new Connection(process.env.SOLANA_RPC ?? 'https://api.devnet.solana.com');
        const lamports = await connection.getBalance(new PublicKey(agent.public_key));
        const next = lamports / 1e9;
        setBalance((prev) => (prev === next ? prev : next));
      } catch (error) {
        setBalance((prev) => (prev === null ? prev : null));
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [agentId, publicKey]);

  const handleSubmit = async (input: string) => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await geminiAgentService.chat(agentId, input, messages);

      const newAssistantMessages: Message[] = [];
      let newAgentIdFromResponse: string | null = null;
      for (const msg of response.messages) {
        try {
          const parsed = JSON.parse(msg);
          let content: string | null = null;
          if (parsed.result) {
            content = String(parsed.result);
          } else if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
            content = parsed.errors.join('\n');
          } else if (Array.isArray(parsed) && parsed[0]?.text) {
            content = parsed.map((b: { text?: string }) => b.text).filter(Boolean).join('');
          }
          if (content) {
            newAssistantMessages.push({ role: 'assistant', content });
            const match = content.match(/Agent ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
            if (match) newAgentIdFromResponse = match[1];
          }
        } catch {
          newAssistantMessages.push({ role: 'assistant', content: msg });
          const match = String(msg).match(/Agent ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
          if (match) newAgentIdFromResponse = match[1];
        }
      }
      if (newAssistantMessages.length > 0) {
        setMessages((prev) => [...prev, ...newAssistantMessages]);
      }
      if (newAgentIdFromResponse) saveAgentConfig(newAgentIdFromResponse);

      if (!agentId) {
        const newAgentId = newAgentIdFromResponse ?? loadAgentConfig();
        if (newAgentId) {
          setAgentId(newAgentId);
          const jsonDb = getApp().get(JsonDbService);
          const agent = await jsonDb.findOne({ where: { id: newAgentId } });
          if (agent) {
            setPublicKey(agent.public_key);
            setMaxSpend(agent.max_spend);
          }
        }
      } else {
        const jsonDb = getApp().get(JsonDbService);
        const agent = await jsonDb.findOne({ where: { id: agentId } });
        if (agent && agent.public_key && !publicKey) {
          setPublicKey(agent.public_key);
        }
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text bold color="cyan">
          Agentic Wallet v0.1.0
        </Text>
      </Box>

      <Box flexGrow={1} flexDirection="row">
        <Box width="70%" borderStyle="single" borderColor="gray" flexDirection="column">
          <LeftPanel messages={messages} isLoading={isLoading} />
        </Box>

        <Box width="30%" borderStyle="single" borderColor="gray" flexDirection="column">
          <RightPanel
            agentId={agentId}
            publicKey={publicKey}
            balance={balance}
            maxSpend={maxSpend}
          />
        </Box>
      </Box>

      <Box borderStyle="single" borderColor="gray">
        <InputPrompt onSubmit={handleSubmit} isLoading={isLoading} />
      </Box>
    </Box>
  );
}
