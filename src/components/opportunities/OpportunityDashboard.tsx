'use client';

import React, { useState, useEffect } from 'react';
import { OpportunityService } from '@/services/OpportunityService';
import { useAuth } from '@/hooks/useAuth';

interface OpportunityMetrics {
  totalOpportunities: number;
  totalValue: number;
  averageDealSize: number;
  winRate: number;
  avgSalesCycle: number;
  pipelineValueByStage: Record<string, { count: number; value: number }>;
}

const OpportunityDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<OpportunityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchMetrics();
    }
  }, [user?.id]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const metrics = await OpportunityService.getMetrics(user.id);
      
      // Convert Decimal values to numbers for display
      const processedMetrics: OpportunityMetrics = {
        ...metrics,
        totalValue: Number(metrics.totalValue),
        averageDealSize: Number(metrics.averageDealSize),
        pipelineValueByStage: Object.fromEntries(
          Object.entries(metrics.pipelineValueByStage).map(([key, value]) => [
            key,
            { 
              count: value.count, 
              value: Number(value.value) 
            }
          ])
        ) as Record<string, { count: number; value: number }>,
      };
      
      setMetrics(processedMetrics);
      setError(null);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load opportunity metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return <div>No metrics available</div>;
  }

  // Calculate total pipeline value
  const totalPipelineValue = Object.values(metrics.pipelineValueByStage)
    .reduce((sum, stage) => sum + stage.value, 0);

  // Define colors for each stage
  const stageColors: Record<string, string> = {
    prospect: 'bg-blue-500',
    qualified: 'bg-indigo-500',
    proposal_sent: 'bg-purple-500',
    negotiation: 'bg-yellow-500',
    won: 'bg-green-500',
    lost: 'bg-red-500',
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Opportunities</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{metrics.totalOpportunities}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Pipeline Value</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        notation: 'compact',
                      }).format(totalPipelineValue)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg. Deal Size</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        notation: 'compact',
                      }).format(metrics.averageDealSize)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Win Rate</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{metrics.winRate.toFixed(1)}%</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg. Sales Cycle</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{metrics.avgSalesCycle} days</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline by Stage */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Pipeline by Stage</h3>
        <div className="space-y-4">
          {Object.entries(metrics.pipelineValueByStage).map(([stage, data]) => (
            <div key={stage} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {stage.replace('_', ' ')} ({data.count})
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    notation: 'compact',
                  }).format(data.value)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`${stageColors[stage]} h-2.5 rounded-full`}
                  style={{
                    width: `${totalPipelineValue > 0 ? (data.value / totalPipelineValue) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Win/Loss Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Win/Loss Analysis</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-700">Won Deals</span>
              <span className="text-sm font-medium text-green-600">
                {metrics.pipelineValueByStage.won.count} deals
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-700">Lost Deals</span>
              <span className="text-sm font-medium text-red-600">
                {metrics.pipelineValueByStage.lost.count} deals
              </span>
            </div>
            <div className="pt-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{metrics.winRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-500">Win Rate</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Top Performing Stages</h3>
          <ul className="divide-y divide-gray-200">
            {Object.entries(metrics.pipelineValueByStage)
              .filter(([stage]) => stage !== 'won' && stage !== 'lost')
              .sort((a, b) => b[1].value - a[1].value)
              .slice(0, 3)
              .map(([stage, data]) => (
                <li key={stage} className="py-3">
                  <div className="flex justify-between">
                    <div className="text-sm font-medium text-gray-900 capitalize">
                      {stage.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {data.count} deals
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      notation: 'compact',
                    }).format(data.value)}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OpportunityDashboard;