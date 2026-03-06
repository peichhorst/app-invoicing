'use client';

import React from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { InstallPromptButton } from '@/app/InstallPromptButton';
import { SwitchBackButton } from '@/components/SwitchBackButton';

const FloatingChatButton = () => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
      <SwitchBackButton variant="floating" />
      <Link
        href="/chat"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        aria-label="Open chat"
      >
        <MessageCircle size={24} />
      </Link>
      <InstallPromptButton variant="floating" />
    </div>
  );
};

export default FloatingChatButton;
