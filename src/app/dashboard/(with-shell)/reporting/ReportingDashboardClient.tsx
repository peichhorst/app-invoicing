"use client";

import ReportingDashboard from "./ReportingDashboard";
import type { ReportingFilters, ReportingSummary } from "@/lib/reporting";

interface ReportingDashboardClientProps {
  initialFilters: ReportingFilters;
  initialSummary: ReportingSummary;
  initialTeamSummary?: ReportingSummary | null;
  statusOptions: string[];
  planTier: string;
  canSeeTeam?: boolean;
  forceTeamOnly?: boolean;
  availableYears?: number[];
}

export default function ReportingDashboardClient(props: ReportingDashboardClientProps) {
  return <ReportingDashboard {...props} />;
}
