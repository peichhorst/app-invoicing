import chatbotService from './ChatbotService';
import { getKnowledgeContext } from './knowledgeBase';

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  text: string;
  sources: string[];
  usedFallback: boolean;
}

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

const buildSystemPrompt = (contextBlocks: string) => `You are the ClientWave app-invoicing assistant.
Use the provided context to answer questions about the app. If the answer is not in the context, say you do not know and suggest where to look.
Keep answers concise and practical.

Context:
${contextBlocks || 'No additional context was found.'}`;

const buildContextBlocks = (chunks: { source: string; text: string }[]) =>
  chunks
    .map((chunk, index) => `[${index + 1}] ${chunk.source}\n${chunk.text}`)
    .join('\n\n');

const extractOutputText = (payload: any) => {
  if (payload && typeof payload.output_text === 'string') {
    return payload.output_text;
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  const parts: string[] = [];

  for (const item of output) {
    if (item?.type !== 'message') continue;
    const contents = Array.isArray(item.content) ? item.content : [];
    for (const content of contents) {
      if (content?.type === 'output_text' && typeof content.text === 'string') {
        parts.push(content.text);
      }
    }
  }

  return parts.join('\n').trim();
};

/**
 * Generates a chat response using app documentation context and OpenAI responses.
 */
export const generateChatResponse = async (
  message: string,
  history: ChatHistoryItem[] = []
): Promise<ChatResponse> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      text: chatbotService.getResponse(message),
      sources: [],
      usedFallback: true
    };
  }

  const context = await getKnowledgeContext(message);
  const contextBlocks = buildContextBlocks(context.chunks);
  const systemPrompt = buildSystemPrompt(contextBlocks);
  const sources = Array.from(new Set(context.chunks.map((chunk) => chunk.source)));

  const trimmedHistory = history
    .filter((entry) => entry.content?.trim())
    .slice(-8)
    .map((entry) => ({
      role: entry.role,
      content: entry.content
    }));

  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: [
        { role: 'system', content: systemPrompt },
        ...trimmedHistory,
        { role: 'user', content: message }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    return {
      text: chatbotService.getResponse(message),
      sources: [],
      usedFallback: true
    };
  }

  const payload = await response.json();
  const text = extractOutputText(payload);

  return {
    text: text || chatbotService.getResponse(message),
    sources,
    usedFallback: !text
  };
};
