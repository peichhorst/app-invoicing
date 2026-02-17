'use client';

import { useEffect, useState } from 'react';

export function DebugPanel() {
  const [logs, setLogs] = useState<Array<{ context: string; data: any; timestamp: string }>>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check localStorage for debug logs
    const interval = setInterval(() => {
      const stored = localStorage.getItem('debug_logs');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setLogs(parsed);
        } catch (e) {
          // ignore parse errors
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700"
      >
        {isOpen ? '✕ Debug' : '◆ Debug (' + logs.length + ')'}
      </button>

      {isOpen && (
        <div className="bg-gray-900 text-green-400 text-xs rounded-lg p-3 max-h-96 overflow-y-auto font-mono border-2 border-green-400 space-y-2">
          {logs.length === 0 ? (
            <div className="text-gray-500 italic">No debug logs yet. Send a message to capture events...</div>
          ) : (
            logs.slice(-20).map((log, i) => (
              <div key={i} className="border-b border-green-400 pb-2">
                <div className="text-yellow-300 font-bold">{log.context}</div>
                <div className="text-green-300 whitespace-pre-wrap break-words text-xs">
                  {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                </div>
                <div className="text-gray-500 text-xs">{log.timestamp}</div>
              </div>
            ))
          )}

          <button
            onClick={() => {
              localStorage.setItem('debug_logs', '[]');
              setLogs([]);
            }}
            className="mt-2 w-full px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs"
          >
            Clear Logs
          </button>
        </div>
      )}
    </div>
  );
}
