import { LLMProvider, StagedEntry } from './types';

export function createLLMProvider(provider: 'anthropic' | 'openai', apiKey: string): LLMProvider {
  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider(apiKey);
    case 'openai':
      return new OpenAIProvider(apiKey);
  }
}

class AnthropicProvider implements LLMProvider {
  constructor(private readonly apiKey: string) {}

  async formatSection(_entries: StagedEntry[], _title: string): Promise<string> {
    // TODO: implement with @anthropic-ai/sdk
    throw new Error('Not yet implemented');
  }

  async restructureDocument(_currentDoc: string): Promise<string> {
    // TODO: implement with @anthropic-ai/sdk
    throw new Error('Not yet implemented');
  }
}

class OpenAIProvider implements LLMProvider {
  constructor(private readonly apiKey: string) {}

  async formatSection(_entries: StagedEntry[], _title: string): Promise<string> {
    // TODO: implement with openai sdk
    throw new Error('Not yet implemented');
  }

  async restructureDocument(_currentDoc: string): Promise<string> {
    // TODO: implement with openai sdk
    throw new Error('Not yet implemented');
  }
}
