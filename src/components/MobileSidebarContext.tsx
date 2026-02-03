'use client';

import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';

type MobileSidebarContextValue = {
  mobileOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const MobileSidebarContext = createContext<MobileSidebarContextValue | undefined>(undefined);

export function MobileSidebarProvider({ children }: PropsWithChildren) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const open = useCallback(() => setMobileOpen(true), []);
  const close = useCallback(() => setMobileOpen(false), []);
  const toggle = useCallback(() => setMobileOpen((prev) => !prev), []);

  const value = useMemo(
    () => ({
      mobileOpen,
      open,
      close,
      toggle,
    }),
    [mobileOpen, open, close, toggle]
  );

  return <MobileSidebarContext.Provider value={value}>{children}</MobileSidebarContext.Provider>;
}

export function useMobileSidebar() {
  const context = useContext(MobileSidebarContext);
  if (!context) {
    throw new Error('useMobileSidebar must be used within a MobileSidebarProvider');
  }
  return context;
}
