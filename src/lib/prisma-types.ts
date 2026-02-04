// Mock Prisma types for compatibility with services
// This allows services to import types without requiring the real Prisma client

// Basic types that mimic Prisma's structure
export type PrismaDecimal = number; // Using JavaScript number instead of Prisma Decimal

// Enum types
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  SIGNED = 'SIGNED',
  COMPLETED = 'COMPLETED',
  PAID = 'PAID',
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  VOID = 'VOID',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum PlanTier {
  FREE = 'FREE',
  PRO_TRIAL = 'PRO_TRIAL',
  PRO = 'PRO',
  TEAM = 'TEAM',
}

// Interface definitions matching Prisma schema
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role | string;
  planTier: PlanTier | string;
  proTrialEndsAt?: Date | string | null;
  proTrialReminderSent: boolean;
  lastSeenAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  companyId?: string;
}

export interface Session {
  id: string;
  token: string;
  userId: string;
  createdAt: Date | string;
  expiresAt?: Date | string;
  user?: User;
}

export interface Company {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Invoice {
  id: string;
  userId: string;
  clientId: string;
  invoiceNumber: string;
  title: string;
  status: InvoiceStatus | string;
    issueDate: Date | string;
    dueDate?: Date | string | null;
    currency?: string;
    notes?: string | null;
  pdfUrl?: string | null;
  subTotal: PrismaDecimal;
  taxRate: PrismaDecimal;
  taxAmount: PrismaDecimal;
  total: PrismaDecimal;
  sentCount: number;
  recurring: boolean;
  recurringInterval?: string | null;
  recurringDayOfMonth?: number | null;
  recurringDayOfWeek?: number | null;
  nextOccurrence?: Date | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: PrismaDecimal;
  taxRate?: PrismaDecimal | null;
  total: PrismaDecimal;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  companyId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Opportunity {
  id: string;
  title: string;
  value: PrismaDecimal;
  status: string;
  companyId: string;
  clientId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Transaction type for compatibility
export type PrismaTransactionClient = typeof import('./prisma').default;

// Prisma module type for compatibility
export namespace Prisma {
  export type Decimal = PrismaDecimal;
}
