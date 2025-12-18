'use client';

import { useEffect } from 'react';

export function HrefEmptyDebugger() {
  useEffect(() => {
    const originals = {
      setAttribute: Element.prototype.setAttribute,
    };

    Element.prototype.setAttribute = function (name: string, value: any) {
      if (name === 'href' && value === '') {
        // eslint-disable-next-line no-console
        console.error('[href=""] setAttribute caught on element:', this);
        // eslint-disable-next-line no-console
        console.trace('[href=""] trace');
        window.dispatchEvent(
          new CustomEvent('href-empty-event', {
            detail: {
              tagName: this.tagName,
              className: this.className,
              id: this.id,
              timestamp: Date.now(),
              stack: new Error().stack,
            },
          }),
        );
        debugger; // optional pause when DevTools is open
      }
      return originals.setAttribute.call(this, name, value);
    };
    return () => {
      Element.prototype.setAttribute = originals.setAttribute;
    };
  }, []);

  return null;
}
