import React from 'react';
import { Box, Text } from 'ink';

interface RightPanelProps {
  agentId?: string;
  publicKey: string | null;
  balance: number | null;
  maxSpend: string | null;
}

export default function RightPanel({
  agentId,
  publicKey,
  balance,
  maxSpend,
}: RightPanelProps) {
  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Agent Info
        </Text>
      </Box>

      {agentId ? (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text dimColor>Agent ID:</Text>
          </Box>
          <Box marginBottom={1}>
            <Text>{agentId.substring(0, 16)}...</Text>
          </Box>

          {maxSpend && (
            <>
              <Box marginBottom={1}>
                <Text dimColor>Max Spend:</Text>
              </Box>
              <Box marginBottom={1}>
                <Text color="yellow">{maxSpend} SOL</Text>
              </Box>
            </>
          )}

          {publicKey ? (
            <>
              <Box marginBottom={1}>
                <Text dimColor>Public Key:</Text>
              </Box>
              <Box marginBottom={1}>
                <Text>{publicKey.substring(0, 20)}...</Text>
              </Box>

              <Box marginBottom={1}>
                <Text dimColor>Balance:</Text>
              </Box>
              <Box marginBottom={1}>
                <Text bold color="green">
                  {balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}
                </Text>
              </Box>
            </>
          ) : (
            <Box marginTop={1}>
              <Text dimColor>No wallet created yet</Text>
            </Box>
          )}
        </Box>
      ) : (
        <Box>
          <Text dimColor>No agent configured</Text>
        </Box>
      )}
    </Box>
  );
}
