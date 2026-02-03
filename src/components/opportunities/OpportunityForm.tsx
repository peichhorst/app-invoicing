'use client';

import React, { useState, useEffect } from 'react';
import { Opportunity, OpportunityStage, OpportunitySource, OpportunityPriority } from '@/types/opportunity';
import { useAuth } from '@/hooks/useAuth';

interface OpportunityFormProps {
  opportunity?: Opportunity;
  onSubmit: (opportunity: Partial<Opportunity>) => void;
  onCancel: () => void;
  clients: Array<{ id: string; companyName?: string; contactName?: string; email?: string }>;
}

const OpportunityForm: React.FC<OpportunityFormProps> = ({ 
  opportunity, 
  onSubmit, 
  onCancel,
  clients
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<Opportunity>>({
    title: '',
    description: '',
    value: 0,
    currency: 'USD',
    probability: 10,
    stage: 'prospect',
    source: 'direct',
    priority: 'medium',
    estimatedCloseDate: '',
    nextActionDate: '',
    nextAction: '',
    notes: '',
    tags: [],
    ...opportunity,
  });
  
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (opportunity) {
      setFormData({
        title: '',
        description: '',
        value: 0,
        currency: 'USD',
        probability: 10,
        stage: 'prospect',
        source: 'direct',
        priority: 'medium',
        estimatedCloseDate: '',
        nextActionDate: '',
        nextAction: '',
        notes: '',
        tags: [],
        ...opportunity,
      });
    }
  }, [opportunity]);

  const handleChange = (field: keyof Opportunity, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when changed
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.clientId) {
      newErrors.clientId = 'Client is required';
    }
    
    if (formData.value === undefined || formData.value < 0) {
      newErrors.value = 'Value must be a positive number';
    }
    
    if (formData.probability === undefined || formData.probability < 0 || formData.probability > 100) {
      newErrors.probability = 'Probability must be between 0 and 100';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter opportunity title"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
              Client *
            </label>
            <select
              id="clientId"
              value={formData.clientId || ''}
              onChange={(e) => handleChange('clientId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.clientId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a client</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.companyName || client.contactName || client.email || 'Unnamed Client'}
                </option>
              ))}
            </select>
            {errors.clientId && <p className="mt-1 text-sm text-red-600">{errors.clientId}</p>}
          </div>

          <div>
            <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Value *
            </label>
            <div className="flex">
              <select
                value={formData.currency || 'USD'}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="px-3 py-2 border border-r-0 rounded-l-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <input
                type="number"
                id="value"
                value={formData.value || ''}
                onChange={(e) => handleChange('value', parseFloat(e.target.value) || 0)}
                className={`flex-1 px-3 py-2 border rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.value ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            {errors.value && <p className="mt-1 text-sm text-red-600">{errors.value}</p>}
          </div>

          <div>
            <label htmlFor="probability" className="block text-sm font-medium text-gray-700 mb-1">
              Probability (%) *
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                id="probability"
                min="0"
                max="100"
                value={formData.probability || 0}
                onChange={(e) => handleChange('probability', parseInt(e.target.value))}
                className="w-full"
              />
              <span className="text-sm font-medium text-gray-700 w-12">
                {formData.probability}%
              </span>
            </div>
            {errors.probability && <p className="mt-1 text-sm text-red-600">{errors.probability}</p>}
          </div>

          <div>
            <label htmlFor="estimatedCloseDate" className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Close Date
            </label>
            <input
              type="date"
              id="estimatedCloseDate"
              value={formData.estimatedCloseDate ? new Date(formData.estimatedCloseDate).toISOString().split('T')[0] : ''}
              onChange={(e) => handleChange('estimatedCloseDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="stage" className="block text-sm font-medium text-gray-700 mb-1">
              Stage
            </label>
            <select
              id="stage"
              value={formData.stage || 'prospect'}
              onChange={(e) => handleChange('stage', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(OpportunityStage).map(stage => (
                <option key={stage} value={stage}>
                  {stage.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <select
              id="source"
              value={formData.source || 'direct'}
              onChange={(e) => handleChange('source', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(OpportunitySource).map(source => (
                <option key={source} value={source}>
                  {source.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority"
              value={formData.priority || 'medium'}
              onChange={(e) => handleChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(OpportunityPriority).map(priority => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="nextAction" className="block text-sm font-medium text-gray-700 mb-1">
              Next Action
            </label>
            <input
              type="text"
              id="nextAction"
              value={formData.nextAction || ''}
              onChange={(e) => handleChange('nextAction', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What's the next step?"
            />
            {formData.nextActionDate && (
              <input
                type="date"
                value={formData.nextActionDate ? new Date(formData.nextActionDate).toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('nextActionDate', e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a tag"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(formData.tags || []).map(tag => (
                <span 
                  key={tag} 
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1.5 flex-shrink-0 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-800 hover:bg-blue-200 focus:outline-none"
                  >
                    <span className="sr-only">Remove</span>
                    <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe the opportunity..."
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Any additional notes..."
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {opportunity ? 'Update Opportunity' : 'Create Opportunity'}
        </button>
      </div>
    </form>
  );
};

export default OpportunityForm;