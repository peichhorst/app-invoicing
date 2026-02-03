'use client';

import { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

type Position = {
  id: string;
  name: string;
  order: number;
  isCustom: boolean;
};

export function PositionManager() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPositionName, setNewPositionName] = useState('');
  const [adding, setAdding] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/positions');
      if (response.ok) {
        const data = await response.json();
        setPositions(data);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('positions-updated'));
        }
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPosition = async () => {
    if (!newPositionName.trim()) return;

    setAdding(true);
    try {
      const response = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPositionName.trim() }),
      });

      if (response.ok) {
        const newPosition = await response.json();
        setPositions(prev => [...prev, newPosition]);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('positions-updated'));
        }
        setNewPositionName('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add position');
      }
    } catch (error) {
      console.error('Error adding position:', error);
      alert('Failed to add position');
    } finally {
      setAdding(false);
    }
  };

  const persistReorder = async (positionId: string, targetIndex: number) => {
    try {
      const response = await fetch(`/api/positions/${positionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', targetIndex }),
      });

      if (response.ok) {
        const updatedPositions = await response.json();
        setPositions(updatedPositions);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to reorder position');
        fetchPositions();
      }
    } catch (error) {
      console.error('Error reordering position:', error);
      alert('Failed to reorder position');
      fetchPositions();
    }
  };

  const movePosition = async (positionId: string, direction: 'up' | 'down') => {
    try {
      const response = await fetch(`/api/positions/${positionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: direction === 'up' ? 'moveUp' : 'moveDown' }),
      });

      if (response.ok) {
        const updatedPositions = await response.json();
        setPositions(updatedPositions);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('positions-updated'));
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to move position');
      }
    } catch (error) {
      console.error('Error moving position:', error);
      alert('Failed to move position');
    }
  };

  const deletePosition = async (positionId: string) => {
    try {
      const response = await fetch(`/api/positions/${positionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updatedPositions = await response.json();
        setPositions(updatedPositions);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('positions-updated'));
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete position');
      }
    } catch (error) {
      console.error('Error deleting position:', error);
      alert('Failed to delete position');
    }
  };

  const handleDragEnd = (positionId: string) => {
    const finalIndex = positions.findIndex((p) => p.id === positionId);
    setDraggingId(null);
    if (finalIndex !== -1) {
      persistReorder(positionId, finalIndex);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('positions-updated'));
      }
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-zinc-500">Loading positions...</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">Company Positions</h2>
        <p className="text-sm text-zinc-500">Manage your company's positions and structure.</p>
      </div>

      {/* Add new position */}
      <div className="mb-1 flex gap-2">
        <input
          type="text"
          value={newPositionName}
          onChange={(e) => setNewPositionName(e.target.value)}
          placeholder="Enter position name"
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-500/20"
          onKeyPress={(e) => e.key === 'Enter' && addPosition()}
        />
        <button
          onClick={addPosition}
          disabled={adding || !newPositionName.trim()}
          className="flex items-center gap-2 rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-700 disabled:opacity-100"
        >
          <Plus size={16} />
          {adding ? 'Adding...' : 'Add'}
        </button>


        
      </div>
        <p className="mb-2 text-sm text-zinc-500">Examples: CEO, Executive, Director, Manager, Team Lead, Sales Agent, Intern</p>

      {/* Position list */}
      <div className="space-y-2">
        {positions.map((position, index) => (
          <div
            key={position.id}
            className={`relative flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3 cursor-grab active:cursor-grabbing transition-all duration-250 ${
              draggingId === position.id ? 'border-brand-primary-200 shadow-xl ring-2 ring-brand-primary-200/60' : ''
            }`}
            draggable
            onDragStart={(e) => {
              setDraggingId(position.id);
              e.dataTransfer?.setData('text/plain', String(index));
              const img = new Image();
              img.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
              e.dataTransfer?.setDragImage(img, 0, 0);
              if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
              if (!draggingId) return;
              const fromIndex = positions.findIndex((p) => p.id === draggingId);
              if (fromIndex === -1 || fromIndex === index) return;
              setPositions((prev) => {
                const currentIndex = prev.findIndex((p) => p.id === draggingId);
                if (currentIndex === -1 || currentIndex === index) return prev;
                const copy = [...prev];
                const [moved] = copy.splice(currentIndex, 1);
                copy.splice(index, 0, moved);
                return copy;
              });
            }}
            onDragEnd={() => draggingId && handleDragEnd(draggingId)}
            style={
              draggingId === position.id
                ? { transform: 'translateY(-6px) scale(1.02)', zIndex: 30 }
                : undefined
            }
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-zinc-700">{position.order}.</span>
              <span className="text-sm font-medium text-zinc-900">{position.name}</span>
              {!position.isCustom && (
                <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600">System</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => movePosition(position.id, 'up')}
                disabled={index === 0}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Move up"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => movePosition(position.id, 'down')}
                disabled={index === positions.length - 1}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Move down"
              >
                <ChevronDown size={16} />
              </button>
              {position.isCustom && (
                <button
                  onClick={() => setDeleteTarget(position)}
                  className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                  title="Delete position"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}

        {positions.length === 0 && (
          <div className="text-center py-8 text-sm text-zinc-500">
            No positions found. Add your first position above.
          </div>
        )}
      </div>
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deletePosition(deleteTarget.id);
          }
        }}
        title="Delete position?"
        message={`Delete ${deleteTarget?.name ?? 'this position'}? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
