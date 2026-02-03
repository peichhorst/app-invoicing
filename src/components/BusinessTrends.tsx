'use client';

import { useState } from 'react';
import { TrendingUp, Target } from 'lucide-react';

type BusinessTrendsProps = {
  currentRevenue: number;
  previousRevenue: number;
  goal: number | null;
  period: 'monthly' | 'quarterly' | 'yearly';
  periodLabel: string;
  companyId: string | null;
  canEdit: boolean;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(value / 100);

export default function BusinessTrends({
  currentRevenue,
  previousRevenue,
  goal,
  period,
  periodLabel,
  companyId,
  canEdit,
}: BusinessTrendsProps) {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalValue, setGoalValue] = useState(goal ? String(goal) : '');
  const [isSaving, setIsSaving] = useState(false);

  const formatNumberWithCommas = (value: string) => {
    const num = value.replace(/,/g, '');
    if (!num || isNaN(Number(num))) return value;
    return Number(num).toLocaleString('en-US');
  };

  const handleGoalInputChange = (value: string) => {
    const numericValue = value.replace(/,/g, '');
    if (numericValue === '' || !isNaN(Number(numericValue))) {
      setGoalValue(formatNumberWithCommas(numericValue));
    }
  };

  const changeAmount = currentRevenue - previousRevenue;
  const changePercent = previousRevenue > 0 ? ((changeAmount / previousRevenue) * 100) : 0;
  const isPositive = changeAmount >= 0;

  const goalProgress = goal && goal > 0 ? (currentRevenue / goal) * 100 : 0;

  // Calculate expected progress based on elapsed time in the period
  const now = new Date();
  let periodStart: Date, periodEnd: Date;
  if (period === 'monthly') {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (period === 'quarterly') {
    const quarter = Math.floor(now.getMonth() / 3);
    periodStart = new Date(now.getFullYear(), quarter * 3, 1);
    periodEnd = new Date(now.getFullYear(), quarter * 3 + 3, 1);
  } else { // yearly
    periodStart = new Date(now.getFullYear(), 0, 1);
    periodEnd = new Date(now.getFullYear() + 1, 0, 1);
  }
  const elapsed = Math.max(0, Math.min(1, (now.getTime() - periodStart.getTime()) / (periodEnd.getTime() - periodStart.getTime())));
  const expectedProgress = elapsed * 100;

  // Compare actual progress to expected progress
  const progressDelta = goalProgress - expectedProgress;
  const goalStatus = goal && goal > 0
    ? progressDelta >= 0 ? 'on-track'
      : progressDelta >= -25 ? 'behind'
        : 'far-behind'
    : null;

  const statusConfig = {
    'exceeded': { label: '🎉 Goal exceeded!', color: 'text-emerald-700 bg-emerald-50' },
    'on-track': { label: '✓ On track', color: 'text-emerald-700 bg-emerald-50' },
    'behind': { label: '⚠ Behind pace', color: 'text-amber-700 bg-amber-50' },
    'far-behind': { label: '⚠ Needs attention', color: 'text-rose-700 bg-rose-50' },
  };

  const handleSaveGoal = async () => {
    if (!companyId || !canEdit) return;
    
    setIsSaving(true);
    try {
      const numericGoal = parseFloat(goalValue.replace(/,/g, ''));
      if (isNaN(numericGoal) || numericGoal < 0) {
        alert('Please enter a valid goal amount');
        return;
      }

      const fieldName = period === 'monthly' ? 'revenueGoalMonthly'
        : period === 'quarterly' ? 'revenueGoalQuarterly'
          : 'revenueGoalYearly';

      const response = await fetch('/api/company/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          [fieldName]: numericGoal,
        }),
      });

      if (!response.ok) throw new Error('Failed to save goal');
      
      setIsEditingGoal(false);
      window.location.reload(); // Refresh to show new goal
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Failed to save goal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary-600">
          Trends & Goals
        </h2>
        <TrendingUp className="h-5 w-5 text-brand-primary-600" />
      </div>

      <div className="space-y-6">
        {/* Revenue Section */}
        <div>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-900">{formatCurrency(currentRevenue)}</span>
            <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isPositive ? '↑' : '↓'} {formatPercent(Math.abs(changePercent))}
            </span>
          </div>
          <p className="text-sm text-zinc-600">
            {formatCurrency(currentRevenue)} compared to {formatCurrency(previousRevenue)} from last {period === 'monthly' ? 'month' : period === 'quarterly' ? 'quarter' : 'year'}.
          
          </p>
        </div>

        {/* Goal Section */}
        {goal && goal > 0 && !isEditingGoal ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-semibold text-zinc-700">{periodLabel} Goal: {formatCurrency(goal)}</span>
              </div>
              {goalStatus && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusConfig[goalStatus].color}`}>
                  {statusConfig[goalStatus].label} ({goalProgress.toFixed(1)}%)
                </span>
              )}
            </div>

            {/* Progress Bar */}
            <div className="relative h-3 overflow-hidden rounded-full bg-zinc-200">
              <div
                className={`h-full transition-all duration-500 ${
                  goalProgress >= 100 ? 'bg-emerald-500'
                    : goalProgress >= 75 ? 'bg-blue-500'
                      : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(goalProgress, 100)}%` }}
              />
            </div>
              {goal && goal > 0 && (
              <> You're {goalProgress >= 100 ? 'ahead of' : 'on track to meet'} your goal of  {formatCurrency(goal)} with {formatPercent(Math.min(goalProgress, 100))} completed!</>
            )}
            <div className="flex items-center justify-between text-xs text-zinc-600">
           
            </div>

            {canEdit && (
              <button
                onClick={() => setIsEditingGoal(true)}
                className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:bg-brand-primary-700"
              >
                Edit Goal
              </button>
            )}
          </div>
        ) : isEditingGoal ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3">
            <label className="block text-sm font-medium text-zinc-700">
              {periodLabel} Revenue Goal
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
                <input
                  type="text"
                  value={goalValue}
                  onChange={(e) => handleGoalInputChange(e.target.value)}
                  placeholder="Enter goal amount"
                  className="w-full rounded-lg border border-zinc-300 pl-7 pr-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
              <button
                onClick={handleSaveGoal}
                disabled={isSaving}
                className="rounded-lg border border-brand-primary-300 bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:border-brand-primary-600 hover:bg-brand-primary-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditingGoal(false);
                  setGoalValue(goal ? String(goal) : '');
                }}
                disabled={isSaving}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : canEdit ? (
          <div className="rounded-lg border-2 border-dashed border-zinc-300 bg-white p-4 text-center">
            <button
              onClick={() => setIsEditingGoal(true)}
              className="text-sm font-medium text-brand-primary-600 hover:text-brand-primary-700"
            >
              + Set {periodLabel} Revenue Goal
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
