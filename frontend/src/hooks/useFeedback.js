import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

export const useSectionFeedback = (sectionId, enabled = true) => {
  return useQuery({
    queryKey: ['sections', sectionId, 'feedback'],
    queryFn: () => api.get(`/feedback/sections/${sectionId}`).then(res => res.data),
    staleTime: 60000, // 1 minute
    enabled: enabled && !!sectionId, // Only fetch when explicitly enabled
  });
};

export const useSubmitFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sectionId, type }) =>
      api.post(`/feedback/sections/${sectionId}`, { type }).then(res => res.data),
    onSuccess: async (data, variables) => {
      // Simply invalidate to trigger a single refetch - no optimistic updates needed
      queryClient.invalidateQueries({ queryKey: ['sections', variables.sectionId, 'feedback'] });
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
      // Simply invalidate to trigger a single refetch
      queryClient.invalidateQueries({ queryKey: ['sections', variables.sectionId, 'feedback'] });
    },
    onError: (err) => {
      console.error('Failed to remove feedback:', err);
    },
  });
};
