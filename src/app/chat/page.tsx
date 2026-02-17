'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DebugPanel } from '@/components/DebugPanel';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot' | 'superadmin';
  timestamp: Date;
  sources?: string[];
  fallback?: boolean;
}

interface OnlineUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  lastSeen: string | null;
}

const SOURCE_ROUTE_MAP: Record<string, string> = {
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
  const [superAdminOnline, setSuperAdminOnline] = useState(false);
  const [superAdminText, setSuperAdminText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [userMessages, setUserMessages] = useState<Record<string, any[]>>({});
  const [superAdminAvailable, setSuperAdminAvailable] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSupportSyncRef = useRef<string | null>(null);
  const supportPollInFlight = useRef(false);
  const onlinePollInFlight = useRef(false);
  const superadminPollInFlight = useRef(false);
  const searchParams = useSearchParams();
  const chatIdParam = searchParams.get('chatId') || searchParams.get('chat_id');

  const activeChatId = useMemo(() => {
    if (!currentUserId) return null;
    if (currentUserRole === 'SUPERADMIN' && chatIdParam) {
      return chatIdParam;
    }
    return currentUserId;
  }, [currentUserId, currentUserRole, chatIdParam]);
  const canSuperAdminReply =
    superAdminOnline && currentUserRole === 'SUPERADMIN' && Boolean(activeChatId);

  const mergeMessages = useCallback((existing: Message[], incoming: Message[]) => {
    const byId = new Map(existing.map((message) => [message.id, message]));
    for (const message of incoming) {
      const current = byId.get(message.id);
      byId.set(message.id, current ? { ...current, ...message } : message);
    }
    return Array.from(byId.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }, []);

  const loadSupportMessages = useCallback(async () => {
    if (!activeChatId || !currentUserId) return;
    if (supportPollInFlight.current) return;
    supportPollInFlight.current = true;
    try {
      const params = new URLSearchParams();
      if (currentUserRole === 'SUPERADMIN') {
        params.set('chatId', activeChatId);
      }
      if (lastSupportSyncRef.current) {
        params.set('since', lastSupportSyncRef.current);
      }
      const url = params.toString() ? `/api/chat/messages?${params.toString()}` : '/api/chat/messages';
      const response = await fetch(url);
      if (!response.ok) return;
      const payload = await response.json();
      const incoming = Array.isArray(payload?.messages) ? payload.messages : [];
      if (!incoming.length) return;

      const mapped = incoming.map((item: any) => ({
        id: String(item.id),
        text: String(item.text ?? ''),
        sender:
          item.fromId === currentUserId
            ? currentUserRole === 'SUPERADMIN' ? 'superadmin' : 'user'
            : item.fromRole === 'BOT'
            ? 'bot'
            : item.fromRole === 'SUPERADMIN'
            ? 'superadmin'
            : 'user',
        timestamp: new Date(item.sentAt),
      })) as Message[];

      setMessages((prev) => mergeMessages(prev, mapped));

      const newest = mapped.reduce((latest, message) => {
        return message.timestamp > latest ? message.timestamp : latest;
      }, mapped[0].timestamp);
      lastSupportSyncRef.current = newest.toISOString();
    } catch (error) {
      // Swallow polling errors to avoid UI spam
    } finally {
      supportPollInFlight.current = false;
    }
  }, [activeChatId, currentUserId, currentUserRole, mergeMessages]);

  const loadOnlineUsers = useCallback(async () => {
    if (currentUserRole !== 'SUPERADMIN') return;
    if (onlinePollInFlight.current) return;
    onlinePollInFlight.current = true;
    try {
      const response = await fetch('/api/chat/online-users');
      if (!response.ok) return;
      const payload = await response.json();
      const users = Array.isArray(payload?.users) ? payload.users : [];
      const sortedUsers = [...users].sort((a, b) => {
        const aSeen = a?.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const bSeen = b?.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        if (aSeen !== bSeen) return bSeen - aSeen;
        return String(a?.id).localeCompare(String(b?.id));
      });
      setOnlineUsers(sortedUsers);
      
      // Fetch messages for each user
      const messagesMap: Record<string, any[]> = {};
      for (const user of sortedUsers) {
        try {
          const msgResponse = await fetch(`/api/chat/messages?chatId=${encodeURIComponent(user.id)}`);
          if (msgResponse.ok) {
            const msgPayload = await msgResponse.json();
            const rawMessages = Array.isArray(msgPayload?.messages) ? msgPayload.messages : [];
            messagesMap[user.id] = rawMessages.filter(
              (msg: any) => msg?.fromId === user.id && msg?.fromRole !== 'SUPERADMIN',
            );
          }
        } catch (err) {
          // Ignore individual message fetch errors
        }
      }
      setUserMessages(messagesMap);
    } catch (error) {
      // Ignore errors to keep UI responsive
    } finally {
      onlinePollInFlight.current = false;
    }
  }, [currentUserRole]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let isActive = true;
    const loadCurrentUser = async () => {
      try {
        const response = await fetch('/api/me');
        if (!response.ok) {
          if (isActive) setSuperAdminOnline(false);
          return;
        }
        const payload = await response.json();
        if (isActive) {
          setSuperAdminOnline(Boolean(payload?.isSuperAdmin));
          setCurrentUserId(typeof payload?.id === 'string' ? payload.id : null);
          setCurrentUserRole(typeof payload?.role === 'string' ? payload.role : null);
        }
      } catch (error) {
        if (isActive) setSuperAdminOnline(false);
      }
    };
    loadCurrentUser();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setSuperAdminAvailable(false);
      return;
    }
    if (process.env.NEXT_PUBLIC_DISABLE_POLLING === 'true') {
      setSuperAdminAvailable(false);
      return;
    }
    let isActive = true;
    const loadSuperadminStatus = async () => {
      if (superadminPollInFlight.current) return;
      superadminPollInFlight.current = true;
      try {
        const response = await fetch('/api/chat/superadmin-status');
        if (!response.ok) {
          if (isActive) setSuperAdminAvailable(false);
          return;
        }
        const payload = await response.json();
        if (isActive) setSuperAdminAvailable(Boolean(payload?.superadminOnline));
      } catch (error) {
        if (isActive) setSuperAdminAvailable(false);
      } finally {
        superadminPollInFlight.current = false;
      }
    };
    loadSuperadminStatus();
    const interval = setInterval(() => {
      loadSuperadminStatus();
    }, 15000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!activeChatId || !currentUserId) return;
    if (process.env.NEXT_PUBLIC_DISABLE_POLLING === 'true') return;
    lastSupportSyncRef.current = null;
    loadSupportMessages();
    const interval = setInterval(() => {
      loadSupportMessages();
    }, 10000);
    return () => clearInterval(interval);
  }, [activeChatId, currentUserId, loadSupportMessages]);

  useEffect(() => {
    if (currentUserRole !== 'SUPERADMIN') return;
    if (!activeChatId) return;
    lastSupportSyncRef.current = null;
    setMessages([]);
  }, [activeChatId, currentUserRole]);

  useEffect(() => {
    if (currentUserRole !== 'SUPERADMIN') {
      setOnlineUsers([]);
      return;
    }
    if (process.env.NEXT_PUBLIC_DISABLE_POLLING === 'true') {
      setOnlineUsers([]);
      return;
    }
    loadOnlineUsers();
    const interval = setInterval(() => {
      loadOnlineUsers();
    }, 15000);
    return () => clearInterval(interval);
  }, [currentUserRole, loadOnlineUsers]);

  const createTempMessage = (text: string, sender: Message['sender']) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const tempMessage: Message = {
      id: tempId,
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, tempMessage]);
    return tempId;
  };

  const persistSupportMessage = async (
    text: string,
    tempId: string,
    sender: Message['sender'],
  ) => {
    if (!activeChatId) return;
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: activeChatId,
          content: text,
          role: sender,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save message');
      }
      const saved = payload?.message;
      if (!saved?.id) return;
      const savedMessage: Message = {
        id: String(saved.id),
        text: String(saved.text ?? text),
        sender:
          saved.fromId === currentUserId
            ? currentUserRole === 'SUPERADMIN' ? 'superadmin' : 'user'
            : saved.fromRole === 'BOT'
            ? 'bot'
            : saved.fromRole === 'SUPERADMIN'
            ? 'superadmin'
            : 'user',
        timestamp: new Date(saved.sentAt),
      };
      setMessages((prev) => {
        const withoutTemp = prev.filter((message) => message.id !== tempId);
        return mergeMessages(withoutTemp, [savedMessage]);
      });
    } catch (error) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === tempId ? { ...message, fallback: true } : message,
        ),
      );
    }
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;

    const tempId = createTempMessage(text, 'user');
    setInputText('');
    setIsLoading(true);

    persistSupportMessage(text, tempId, 'user');

    const historySnapshot = [...messages, { id: tempId, text, sender: 'user', timestamp: new Date() }]
      .filter((message) => message.sender !== 'superadmin')
      .map((message) => ({
        role: message.sender === 'user' ? 'user' : 'assistant',
        content: message.text,
      }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historySnapshot,
        }),
      });

      const payload = await response.json();
      const botText = payload?.response || 'Sorry, I had trouble responding.';
      const botTempId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const botMessage: Message = {
        id: botTempId,
        text: botText,
        sender: 'bot',
        timestamp: new Date(),
        sources: Array.isArray(payload?.sources) ? payload.sources : [],
        fallback: Boolean(payload?.fallback),
      };
      setMessages((prev) => [...prev, botMessage]);
      
      // Persist bot message to database
      persistSupportMessage(botText, botTempId, 'bot');
    } catch (error) {
      const botText = 'Sorry, I had trouble responding. Please try again.';
      const botTempId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const botMessage: Message = {
        id: botTempId,
        text: botText,
        sender: 'bot',
        timestamp: new Date(),
        sources: [],
        fallback: true,
      };
      setMessages((prev) => [...prev, botMessage]);
      
      // Persist error message to database
      persistSupportMessage(botText, botTempId, 'bot');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendSuperAdminMessage = async () => {
    if (!canSuperAdminReply) return;
    const text = superAdminText.trim();
    if (!text) return;

    const tempId = createTempMessage(text, 'superadmin');
    setSuperAdminText('');
    persistSupportMessage(text, tempId, 'superadmin');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAdminKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendSuperAdminMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-800">ClientWave Assistant</h1>
            {currentUserRole !== 'SUPERADMIN' && superAdminAvailable && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Live Agent Online
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">Ask me anything about ClientWave</p>
        </div>
      </div>

      {currentUserRole === 'SUPERADMIN' && (
        <div className="bg-white border-b p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col gap-2 text-xs text-gray-600">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Online Users
              </span>
              {onlineUsers.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {onlineUsers.map((user) => (
                    <div key={user.id} className="rounded-lg border border-emerald-100 bg-emerald-50 p-2">
                      <Link
                        href={`/chat?chatId=${encodeURIComponent(user.id)}`}
                        className="rounded-full border border-emerald-100 bg-emerald-100 px-2 py-0.5 text-emerald-700 hover:border-emerald-200 hover:bg-emerald-100 inline-block"
                      >
                        {user.name || user.email || 'User'}
                      </Link>
                      <div className="mt-2 text-xs text-emerald-600 bg-white rounded p-2 max-h-24 overflow-y-auto">
                        {userMessages[user.id]?.length ? (
                          [...userMessages[user.id]]
                            .sort(
                              (a, b) =>
                                new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
                            )
                            .map((msg, idx) => (
                              <div key={idx} className="border-b border-emerald-100 pb-1 mb-1 last:border-b-0">
                                <span className="text-[10px] text-emerald-500">{new Date(msg.sentAt).toLocaleTimeString()}</span>
                                <p className="text-xs text-emerald-700 break-words">{msg.text}</p>
                              </div>
                            ))
                        ) : (
                          <span className="text-emerald-500 italic">No messages</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400">No users online</span>
              )}
            </div>
          </div>
        </div>
      )}

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
                    : message.sender === 'superadmin'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {message.sender === 'superadmin' && (
                  <div className="text-[10px] uppercase tracking-wide text-emerald-100">
                    Superadmin
                  </div>
                )}
                <div className="text-sm">{message.text}</div>
                <div
                  className={`text-xs mt-1 ${
                    message.sender === 'user'
                      ? 'text-blue-200'
                      : message.sender === 'superadmin'
                      ? 'text-emerald-100'
                      : 'text-gray-500'
                  }`}
                >
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
        <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-2">
          {canSuperAdminReply && (
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <textarea
                  value={superAdminText}
                  onChange={(e) => setSuperAdminText(e.target.value)}
                  onKeyPress={handleAdminKeyPress}
                  placeholder="Superadmin reply..."
                  className="flex-1 border border-emerald-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={1}
                />
                <button
                  onClick={handleSendSuperAdminMessage}
                  disabled={!superAdminText.trim()}
                  className="bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  Reply
                </button>
              </div>
            </div>
          )}
          {currentUserRole !== 'SUPERADMIN' && (
            <>
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
            </>
          )}
        </div>
      </div>
      <DebugPanel />
    </div>
  );
};

export default SimpleChatBot;
