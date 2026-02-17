export function debugLog(context: string, data: any) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${context}`;
  console.log(message, data);
  
  // Store in localStorage for client-side display
  if (typeof window !== 'undefined') {
    try {
      const key = 'debug_logs';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({ context, data, timestamp });
      // Keep only last 100 logs
      if (existing.length > 100) {
        existing.splice(0, existing.length - 100);
      }
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) {
      console.error('Failed to store debug log', e);
    }
  }
  
  return message;
}

export function storeDebugLog(context: string, data: any) {
  if (typeof window !== 'undefined') {
    try {
      const key = 'debug_logs';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({ context, data, timestamp: new Date().toISOString() });
      // Keep only last 100 logs
      if (existing.length > 100) {
        existing.splice(0, existing.length - 100);
      }
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) {
      console.error('Failed to store debug log', e);
    }
  }
}
