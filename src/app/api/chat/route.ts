import { NextRequest } from 'next/server';
import { generateChatResponse } from '../../../services/chatAgent';

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, history } = await request.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const response = await generateChatResponse(
      message,
      Array.isArray(history) ? (history as ChatHistoryItem[]) : []
    );

    return new Response(
      JSON.stringify({
        success: true,
        response: response.text,
        sources: response.sources,
        fallback: response.usedFallback,
        timestamp: new Date().toISOString(),
        sessionId: sessionId || 'default-session'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// For testing purposes, we'll also implement a GET method to return sample responses
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const message = url.searchParams.get('message') || 'hello';

  const response = await generateChatResponse(message);

  return new Response(
    JSON.stringify({
      success: true,
      input: message,
      response: response.text,
      sources: response.sources,
      fallback: response.usedFallback,
      timestamp: new Date().toISOString()
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
