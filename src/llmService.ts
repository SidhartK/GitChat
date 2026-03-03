import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { LLMProvider, StagedEntry } from './types';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createLLMProvider(
  provider: 'anthropic' | 'openai',
  apiKey: string,
): LLMProvider {
  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider(apiKey);
    case 'openai':
      return new OpenAIProvider(apiKey);
  }
}

// ---------------------------------------------------------------------------
// Shared prompt helpers
// ---------------------------------------------------------------------------

function buildEntrySummary(entries: StagedEntry[]): string {
  return entries
    .map((e, i) => {
      const ts = new Date(e.timestamp).toLocaleString();
      if (e.type === 'note') {
        return `[${i + 1}] NOTE (${ts}):\n${e.note}`;
      }
      const art = e.artifact!;
      if (art.filePath) {
        return `[${i + 1}] ARTIFACT (${ts}): type=${art.type}, file=${art.filePath}${art.inlineContent ? `\nContent preview:\n${art.inlineContent.substring(0, 500)}` : ''}`;
      }
      return `[${i + 1}] ARTIFACT (${ts}): type=${art.type}${art.inlineContent ? `\nContent:\n${art.inlineContent.substring(0, 500)}` : ''}`;
    })
    .join('\n\n');
}

const FORMAT_SYSTEM_PROMPT = `You are a technical documentation assistant for a data analysis notebook. Your job is to take a collection of user notes and captured artifacts (images, tables, text outputs) and format them into a clean, well-structured markdown section.

Rules:
- Preserve the user's notes verbatim — you may lightly restructure or add formatting (headers, bullet points, bold) but never alter the meaning or remove content.
- Reference artifact images using standard markdown syntax: ![description](path)
- Reference artifact HTML/text files using markdown links: [description](path)
- Add appropriate sub-headers (##, ###) to organize the content logically.
- If the user notes mention findings, observations, or conclusions, highlight them clearly.
- Output ONLY the markdown section content — no preamble, no wrapping fences.`;

const RESTRUCTURE_SYSTEM_PROMPT = `You are a technical documentation assistant. You will be given the full contents of a markdown analysis document. Your job is to reorganize it for improved readability and structure.

Rules:
- NEVER remove any content — every piece of text, image reference, and data must be preserved.
- You may reorder sections, fix or add headers, improve formatting, merge redundant sections, and add a table of contents.
- Maintain all artifact/image references exactly as they appear (paths must not change).
- Output ONLY the reorganized document content — no preamble, no wrapping fences.`;

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------

class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async formatSection(entries: StagedEntry[], title: string): Promise<string> {
    const entrySummary = buildEntrySummary(entries);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: FORMAT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Section title: "${title}"\n\nEntries to format:\n\n${entrySummary}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Anthropic returned no text content.');
    }
    return textBlock.text;
  }

  async restructureDocument(currentDoc: string): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: RESTRUCTURE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is the current document to reorganize:\n\n${currentDoc}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Anthropic returned no text content.');
    }
    return textBlock.text;
  }
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async formatSection(entries: StagedEntry[], title: string): Promise<string> {
    const entrySummary = buildEntrySummary(entries);

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: FORMAT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Section title: "${title}"\n\nEntries to format:\n\n${entrySummary}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned no content.');
    }
    return content;
  }

  async restructureDocument(currentDoc: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 8192,
      messages: [
        { role: 'system', content: RESTRUCTURE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Here is the current document to reorganize:\n\n${currentDoc}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned no content.');
    }
    return content;
  }
}
