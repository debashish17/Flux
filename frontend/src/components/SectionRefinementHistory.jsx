import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { History, RotateCcw, X, Clock } from 'lucide-react';
import api from '../api';

export default function SectionRefinementHistory({ sectionId, onRestore, isOpen = true, onClose = null }) {
  const queryClient = useQueryClient();

  // Fetch refinement history (always enabled when component is rendered)
  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['sections', sectionId, 'history'],
    queryFn: () => api.get(`/sections/${sectionId}/refinement-history`).then(res => res.data),
    enabled: isOpen,
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: (snapshotId) =>
      api.post(`/sections/${sectionId}/refinement-history/${snapshotId}/restore`).then(res => res.data),
    onSuccess: (data) => {
      // Only call parent's onRestore callback - let parent handle cache updates
      if (onRestore) onRestore(data);
      alert('Section restored successfully!');
      if (onClose) onClose(); // Close panel after restore
    },
    onError: (error) => {
      alert(`Failed to restore: ${error.response?.data?.detail || error.message}`);
    }
  });

  const handleRestore = (snapshotId) => {
    if (window.confirm('Are you sure you want to restore this version? This will replace your current content.')) {
      restoreMutation.mutate(snapshotId);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getChangeTypeLabel = (changeType) => {
    if (!changeType) return 'Unknown';
    if (changeType.startsWith('feedback_regeneration')) return 'Feedback Regeneration';
    if (changeType.startsWith('refinement')) return 'AI Refinement';
    if (changeType.startsWith('before_restore')) return 'Auto-save';
    if (changeType === 'manual') return 'Manual Edit';
    return changeType;
  };

  const getChangeTypeColor = (changeType) => {
    if (!changeType) return 'bg-gray-100 text-gray-600';
    if (changeType.startsWith('feedback_regeneration')) return 'bg-red-100 text-red-700';
    if (changeType.startsWith('refinement')) return 'bg-blue-100 text-blue-700';
    if (changeType.startsWith('before_restore')) return 'bg-gray-100 text-gray-600';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Refinement History</h3>
          {snapshots.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-200 rounded-full">{snapshots.length}</span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading history...</div>
              ) : snapshots.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No history yet</p>
                  <p className="text-sm text-gray-400 mt-1">Snapshots will appear here when you refine this section</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {snapshots.map((snapshot, index) => (
                    <div
                      key={snapshot.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getChangeTypeColor(snapshot.changeType)}`}>
                              {getChangeTypeLabel(snapshot.changeType)}
                            </span>
                            {index === 0 && (
                              <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                                Latest
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatDate(snapshot.createdAt)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRestore(snapshot.id)}
                          disabled={restoreMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                      </div>

                      <div className="bg-gray-50 rounded p-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">{snapshot.title}</h4>
                        <div className="text-sm text-gray-600 max-h-32 overflow-y-auto whitespace-pre-wrap">
                          {snapshot.content.substring(0, 300)}
                          {snapshot.content.length > 300 && '...'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
      </div>

      {/* Footer */}
      {snapshots.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-300">
          <p className="text-xs text-gray-600">
            <strong>Tip:</strong> Restoring a snapshot will replace your current content.
          </p>
        </div>
      )}
    </div>
  );
}
