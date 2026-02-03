export interface Opportunity {
  id: string;
  title: string;
  description?: string;
  clientId: string;
  clientName?: string;
  value: number;
  currency: string;
  probability: number; // 0-100 percentage
  stage: OpportunityStage;
  pipelineId: string;
  assignedToId: string;
  assignedToName?: string;
  estimatedCloseDate?: Date;
  actualCloseDate?: Date;
  source: OpportunitySource;
  tags: string[];
  priority: OpportunityPriority;
  createdAt: Date;
  updatedAt: Date;
  lastActivityDate?: Date;
  nextActionDate?: Date;
  nextAction?: string;
  notes?: string;
  customFields?: Record<string, any>;
}

export enum OpportunityStage {
  PROSPECT = 'prospect',
  QUALIFIED = 'qualified',
  PROPOSAL_SENT = 'proposal_sent',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
}

export enum OpportunitySource {
  REFERRAL = 'referral',
  DIRECT = 'direct',
  SOCIAL_MEDIA = 'social_media',
  WEBSITE = 'website',
  EVENT = 'event',
  PARTNER = 'partner',
  ADVERTISING = 'advertising',
}

export enum OpportunityPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface OpportunitySearchParams {
  query?: string;
  stage?: OpportunityStage[];
  source?: OpportunitySource[];
  priority?: OpportunityPriority[];
  min_value?: number;
  max_value?: number;
  probability_min?: number;
  probability_max?: number;
  assigned_to?: string;
  created_after?: Date;
  created_before?: Date;
  tags?: string[];
  sortBy?: 'value' | 'probability' | 'created_at' | 'estimated_close_date';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface OpportunityMetrics {
  totalOpportunities: number;
  totalValue: number;
  averageDealSize: number;
  winRate: number;
  avgSalesCycle: number; // in days
  pipelineValueByStage: Record<OpportunityStage, { count: number; value: number }>;
}