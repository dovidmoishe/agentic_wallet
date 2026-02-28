import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import LeftPanel from './LeftPanel.js';
import RightPanel from './RightPanel.js';
import InputPrompt from './InputPrompt.js';
import { ClaudeAgentService } from '../../agent/claude-agent.service.js';
import { AgentService } from '../../agent/agent.service.js';
import { WalletService } from '../../wallet/wallet.service.js';
import { loadAgentConfig, saveAgentConfig } from '../utils/agent-config.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AppProps {
  claudeAgentService: ClaudeAgentService;
  agentService: AgentService;
  walletService: WalletService;
}

export default function App({
  claudeAgentService,
  agentService,
  walletService,
}: AppProps) {
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
          const agent = await agentService.findOne(savedAgentId);
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
  }, [agentService]);

  useEffect(() => {
    if (!agentId || !publicKey) return;

    const fetchBalance = async () => {
      try {
        const lamports = await walletService.getBalance(agentId);
        setBalance(lamports / 1e9);
      } catch (error) {
        setBalance(null);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [agentId, publicKey, walletService]);

  const handleSubmit = async (input: string) => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await claudeAgentService.chat(agentId, input);

      let newAgentIdFromResponse: string | null = null;
      for (const msg of response.messages) {
        try {
          const parsed = JSON.parse(msg);
          if (parsed.result) {
            const content = String(parsed.result);
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content },
            ]);
            const match = content.match(/Agent ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
            if (match) newAgentIdFromResponse = match[1];
          }
        } catch {
          setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
          const match = String(msg).match(/Agent ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
          if (match) newAgentIdFromResponse = match[1];
        }
      }
      if (newAgentIdFromResponse) saveAgentConfig(newAgentIdFromResponse);

      if (!agentId) {
        const newAgentId = newAgentIdFromResponse ?? loadAgentConfig();
        if (newAgentId) {
          setAgentId(newAgentId);
          const agent = await agentService.findOne(newAgentId);
          if (agent) {
            setPublicKey(agent.public_key);
            setMaxSpend(agent.max_spend);
          }
        }
      } else {
        const agent = await agentService.findOne(agentId);
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
