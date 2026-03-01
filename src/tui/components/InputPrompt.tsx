import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface InputPromptProps {
  onSubmit: (input: string) => void;
  isLoading: boolean;
}

export default function InputPrompt({ onSubmit, isLoading }: InputPromptProps) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (!isLoading && input.trim()) {
      onSubmit(input);
      setInput('');
    }
  };

  return (
    <Box paddingX={1}>
      <Text color="cyan">&gt; </Text>
      <TextInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        placeholder={isLoading ? 'Processing...' : 'Type a message...'}
      />
    </Box>
  );
}
