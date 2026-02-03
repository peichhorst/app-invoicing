'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  sources?: string[];
  fallback?: boolean;
}

const SOURCE_ROUTE_MAP: Record<string, string> = {
  'docs/README.md': '/docs',
  'README.md': '/docs',
  'DOCUMENTATION.md': '/docs',
  'DOCS_INDEX.md': '/docs',
  'docs/overview.md': '/docs',
  'docs/opportunities.md': '/docs/opportunities',
  'docs/invoices.md': '/docs/invoices',
  'docs/proposals.md': '/docs/proposals',
  'docs/contracts.md': '/docs/contracts',
  'docs/clients.md': '/docs/clients',
  'docs/templates.md': '/docs/templates',
  'docs/api-reference.md': '/docs/api',
  'docs/faq.md': '/docs/faq',
};

const SOURCE_TITLES: Record<string, string> = {
  'docs/README.md': 'Documentation Overview',
  'README.md': 'Documentation Overview',
  'DOCUMENTATION.md': 'Documentation Overview',
  'DOCS_INDEX.md': 'Documentation Overview',
  'docs/overview.md': 'Documentation Overview',
  'docs/opportunities.md': 'Opportunities',
  'docs/invoices.md': 'Invoices',
  'docs/proposals.md': 'Proposals',
  'docs/contracts.md': 'Contracts',
  'docs/clients.md': 'Clients',
  'docs/templates.md': 'Templates',
  'docs/api-reference.md': 'API Reference',
  'docs/faq.md': 'FAQ',
};

const getSourceHref = (source: string) => {
  const normalized = source.replace(/\\/g, '/');
  const mapped = SOURCE_ROUTE_MAP[normalized];
  if (mapped) return mapped;
  return `/docs/source?path=${encodeURIComponent(normalized)}`;
};

const getSourceLabel = (source: string) => {
  const normalized = source.replace(/\\/g, '/');
  return SOURCE_TITLES[normalized] ?? normalized;
};

const SimpleChatBot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your ClientWave assistant. How can I help you today?',
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    const historySnapshot = messages.map((message) => ({
      role: message.sender === 'user' ? 'user' : 'assistant',
      content: message.text
    }));

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          history: historySnapshot
        })
      });

      const payload = await response.json();
      const botMessage: Message = {
        id: Date.now().toString(),
        text: payload?.response || 'Sorry, I had trouble responding.',
        sender: 'bot',
        timestamp: new Date(),
        sources: Array.isArray(payload?.sources) ? payload.sources : [],
        fallback: Boolean(payload?.fallback),
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const botMessage: Message = {
        id: Date.now().toString(),
        text: 'Sorry, I had trouble responding. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
        sources: [],
        fallback: true,
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-800">ClientWave Assistant</h1>
          <p className="text-sm text-gray-600">Ask me anything about ClientWave</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <div className="text-sm">{message.text}</div>
                <div className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                {message.sender === 'bot' && message.sources && message.sources.length > 0 && (
                  <div className="mt-2 rounded-md border border-gray-300/70 bg-white/70 px-2 py-1 text-[11px] text-gray-700">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Sources</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {message.sources.map((source) => (
                        <Link
                          key={source}
                          href={getSourceHref(source)}
                          className="text-blue-600 hover:underline"
                        >
                          {getSourceLabel(source)}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200 text-gray-800">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t p-4 fixed bottom-0 left-0 right-0">
        <div className="max-w-4xl mx-auto flex space-x-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputText.trim()}
            className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleChatBot;
