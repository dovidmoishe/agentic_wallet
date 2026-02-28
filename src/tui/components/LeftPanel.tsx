import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface LeftPanelProps {
  messages: Message[];
  isLoading: boolean;
}

export default function LeftPanel({ messages, isLoading }: LeftPanelProps) {
  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Chat
        </Text>
      </Box>

      <Box flexDirection="column">
        {messages.map((message, index) => (
          <Box key={index} marginBottom={1} flexDirection="column">
            <Text bold color={message.role === 'user' ? 'green' : 'blue'}>
              {message.role === 'user' ? 'You' : 'Agent'}:
            </Text>
            <Text>{message.content}</Text>
          </Box>
        ))}

        {isLoading && (
          <Box>
            <Text color="gray">
              <Spinner type="dots" /> Thinking...
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
