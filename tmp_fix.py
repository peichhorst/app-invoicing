# -*- coding: utf-8 -*-
from pathlib import Path
path=Path('src/app/dashboard/DashboardSidebar.tsx')
text=path.read_text(encoding='utf-8')
old="""const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dY\"S', exact: true },
    { label: 'Clients', href: '/dashboard/clients', icon: 'dY`\x9d' },
  { label: 'Invoices', href: '/dashboard/invoices', icon: 'dY\"\x0f' },
  { label: 'Recurring', href: '/recurring', icon: 'dY\",' },

  { label: 'Settings', href: '/dashboard/profile', icon: 'ƒsT‹,?' },
];"""
new="""const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '??', exact: true },
  { label: 'Invoices', href: '/dashboard/invoices', icon: '??' },
  { label: 'Recurring', href: '/dashboard/recurring', icon: '??' },
  { label: 'Clients', href: '/dashboard/clients', icon: '??' },
  { label: 'Settings', href: '/dashboard/profile', icon: '??' },
];"""
if old not in text:
    raise SystemExit('old block not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
