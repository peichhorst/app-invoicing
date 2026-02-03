'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Opportunity, OpportunityStage, OpportunitySource, OpportunityPriority } from '@/types/opportunity';
import { useAuth } from '@/hooks/useAuth';

interface OpportunitySearchProps {
  onSearchResults?: (opportunities: Opportunity[], totalCount: number) => void;
}

const OpportunitySearch: React.FC<OpportunitySearchProps> = ({ onSearchResults }) => {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [stage, setStage] = useState<OpportunityStage[]>([]);
  const [source, setSource] = useState<OpportunitySource[]>([]);
  const [priority, setPriority] = useState<OpportunityPriority[]>([]);
  const [minValue, setMinValue] = useState(searchParams.get('min_value') || '');
  const [maxValue, setMaxValue] = useState(searchParams.get('('max_value') || '');
  const [probabilityMin, setProbabilityMin] = useState(searchParams.get('probability_min') || '');
  const [probabilityMax, setProbabilityMax] = useState(searchParams.get('probability_max') || '');
  const [assignedTo, setAssignedTo] = useState(searchParams.get('assigned_to') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'created_at');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sort_order') || 'desc');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Load initial filters from URL
  useEffect(() => {
    const stageParam = searchParams.get('stage');
    if (stageParam) setStage(stageParam.split(',') as OpportunityStage[]);
    
    const sourceParam = searchParams.get('source');
    if (sourceParam) setSource(sourceParam.split(',') as OpportunitySource[]);
    
    const priorityParam = searchParams.get('priority');
    if (priorityParam) setPriority(priorityParam.split(',') as OpportunityPriority[]);
  }, []);

  const buildSearchParams = () => {
    const params = new URLSearchParams();
    
    if (query) params.set('q', query);
    if (stage.length > 0) params.set('stage', stage.join(','));
    if (source.length > 0) params.set('source', source.join(','));
    if (priority.length > 0) params.set('priority', priority.join(','));
    if (minValue) params.set('min_value', minValue);
    if (maxValue) params.set('max_value', maxValue);
    if (probabilityMin) params.set('probability_min', probabilityMin);
    if (probabilityMax) params.set('probability_max', probabilityMax);
    if (assignedTo) params.set('assigned_to', assignedTo);
    if (sortBy) params.set('sort_by', sortBy);
    if (sortOrder) params.set('sort_order', sortOrder);
    params.set('page', page.toString());
    
    return params.toString();
  };

  const performSearch = async () => {
    setLoading(true);
    
    try {
      const searchParams = buildSearchParams();
      const response = await fetch(`/api/opportunities?${searchParams}`);
      const data = await response.json();
      
      if (response.ok) {
        setOpportunities(data.opportunities);
        setTotalCount(data.totalCount);
        
        if (onSearchResults) {
          onSearchResults(data.opportunities, data.totalCount);
        }
        
        // Update URL with search params
        router.push(`?${searchParams}`, { scroll: false });
      } else {
        console.error('Search failed:', data.error);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch();
  }, [query, stage, source, priority, minValue, maxValue, probabilityMin, 
      probabilityMax, assignedTo, sortBy, sortOrder, page]);

  const handleStageChange = (value: OpportunityStage, checked: boolean) => {
    if (checked) {
      setStage(prev => [...prev, value]);
    } else {
      setStage(prev => prev.filter(s => s !== value));
    }
  };

  const handleSourceChange = (value: OpportunitySource, checked: boolean) => {
    if (checked) {
      setSource(prev => [...prev, value]);
    } else {
      setSource(prev => prev.filter(s => s !== value));
    }
  };

  const handlePriorityChange = (value: OpportunityPriority, checked: boolean) => {
    if (checked) {
      setPriority(prev => [...prev, value]);
    } else {
      setPriority(prev => prev.filter(p => p !== value));
    }
  };

  const totalPages = Math.ceil(totalCount / 20);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or description..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            id="sortBy"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="created_at">Created Date</option>
            <option value="value">Value</option>
            <option value="probability">Probability</option>
            <option value="estimated_close_date">Estimated Close Date</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
            Order
          </label>
          <select
            id="sortOrder"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
            Assigned To
          </label>
          <input
            type="text"
            id="assignedTo"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="User ID or name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Stage</h3>
          {Object.values(OpportunityStage).map((stageValue) => (
            <div key={stageValue} className="flex items-center">
              <input
                type="checkbox"
                id={`stage-${stageValue}`}
                checked={stage.includes(stageValue)}
                onChange={(e) => handleStageChange(stageValue, e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={`stage-${stageValue}`} className="ml-2 text-sm text-gray-700 capitalize">
                {stageValue.replace('_', ' ')}
              </label>
            </div>
          ))}
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Source</h3>
          {Object.values(OpportunitySource).map((sourceValue) => (
            <div key={sourceValue} className="flex items-center">
              <input
                type="checkbox"
                id={`source-${sourceValue}`}
                checked={source.includes(sourceValue)}
                onChange={(e) => handleSourceChange(sourceValue, e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={`source-${sourceValue}`} className="ml-2 text-sm text-gray-700 capitalize">
                {sourceValue.replace('_', ' ')}
              </label>
            </div>
          ))}
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Priority</h3>
          {Object.values(OpportunityPriority).map((priorityValue) => (
            <div key={priorityValue} className="flex items-center">
              <input
                type="checkbox"
                id={`priority-${priorityValue}`}
                checked={priority.includes(priorityValue)}
                onChange={(e) => handlePriorityChange(priorityValue, e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={`priority-${priorityValue}`} className="ml-2 text-sm text-gray-700 capitalize">
                {priorityValue}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="minValue" className="block text-sm font-medium text-gray-700 mb-1">
            Min Value ($)
          </label>
          <input
            type="number"
            id="minValue"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
            placeholder="Minimum value"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="maxValue" className="block text-sm font-medium text-gray-700 mb-1">
            Max Value ($)
          </label>
          <input
            type="number"
            id="maxValue"
            value={maxValue}
            onChange={(e) => setMaxValue(e.target.value)}
            placeholder="Maximum value"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="probabilityMin" className="block text-sm font-medium text-gray-700 mb-1">
            Min Probability (%)
          </label>
          <input
            type="number"
            id="probabilityMin"
            value={probabilityMin}
            onChange={(e) => setProbabilityMin(e.target.value)}
            placeholder="Min probability"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="probabilityMax" className="block text-sm font-medium text-gray-700 mb-1">
            Max Probability (%)
          </label>
          <input
            type="number"
            id="probabilityMax"
            value={probabilityMax}
            onChange={(e) => setProbabilityMax(e.target.value)}
            placeholder="Max probability"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
            Showing {opportunities.length} of {totalCount} opportunities
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Probability
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Close Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {opportunities.map((opportunity) => (
                  <tr key={opportunity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{opportunity.title}</div>
                      <div className="text-sm text-gray-500">{opportunity.description?.substring(0, 50)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {opportunity.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: opportunity.currency,
                      }).format(Number(opportunity.value))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        opportunity.stage === 'won' ? 'bg-green-100 text-green-800' :
                        opportunity.stage === 'lost' ? 'bg-red-100 text-red-800' :
                        opportunity.stage === 'negotiation' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {opportunity.stage.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {opportunity.probability}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {opportunity.estimatedCloseDate ? new Date(opportunity.estimatedCloseDate).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OpportunitySearch;