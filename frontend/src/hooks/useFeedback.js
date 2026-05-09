import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

export const useSectionFeedback = (sectionId, enabled = true) => {
  return useQuery({
    queryKey: ['sections', sectionId, 'feedback'],
    queryFn: () => api.get(`/feedback/sections/${sectionId}`).then(res => res.data),
    staleTime: 60000, // 1 minute
    enabled: enabled && !!sectionId, // Only fetch when explicitly enabled
    retry: 1,
  });
};

export const useSubmitFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sectionId, type }) =>
      api.post(`/feedback/sections/${sectionId}`, { type }).then(res => res.data),
    onSuccess: (data, variables) => {
      // OPTIMIZED: Update batch cache directly (no refetch needed)
      queryClient.setQueryData(['projects', parseInt(variables.projectId), 'feedback'], (old) => {
        if (!old) return old;
        return {
          ...old,
          [variables.sectionId]: data
        };
      });

      // Also update individual cache if it exists
      queryClient.setQueryData(['sections', variables.sectionId, 'feedback'], data);
    },
    onError: (err) => {
      console.error('Failed to submit feedback:', err);
    },
  });
};

export const useRemoveFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sectionId }) =>
      api.delete(`/feedback/sections/${sectionId}`).then(res => res.data),
    onSuccess: (data, variables) => {
      // OPTIMIZED: Update batch cache directly
      queryClient.setQueryData(['projects', parseInt(variables.projectId), 'feedback'], (old) => {
        if (!old) return old;
        const updated = { ...old };
        delete updated[variables.sectionId];
        return updated;
      });

      // Clear individual cache
      queryClient.setQueryData(['sections', variables.sectionId, 'feedback'], null);
    },
    onError: (err) => {
      console.error('Failed to remove feedback:', err);
    },
  });
};
