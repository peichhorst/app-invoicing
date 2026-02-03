'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

const FloatingChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating chat button */}
      <Link 
        href="/chat"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        aria-label="Open chat"
      >
        <MessageCircle size={24} />
      </Link>
    </>
  );
};

export default FloatingChatButton;