import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

export const useSectionComments = (sectionId, enabled = true) => {
  return useQuery({
    queryKey: ['sections', sectionId, 'comments'],
    queryFn: () => api.get(`/feedback/sections/${sectionId}/comments`).then(res => res.data),
    staleTime: 60000,
    enabled: enabled && !!sectionId, // Only fetch when explicitly enabled
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sectionId, comment }) =>
      api.post(`/feedback/sections/${sectionId}/comments`, { comment }).then(res => res.data),
    onSuccess: (newComment, variables) => {
      // OPTIMIZED: Update batch cache directly
      queryClient.setQueryData(['projects', parseInt(variables.projectId), 'comments'], (old) => {
        if (!old) return old;
        return {
          ...old,
          [variables.sectionId]: [...(old[variables.sectionId] || []), newComment]
        };
      });

      // Update individual cache
      queryClient.setQueryData(['sections', variables.sectionId, 'comments'], (old) => {
        return [...(old || []), newComment];
      });
    },
    onError: (err) => {
      console.error('Failed to save comment:', err);
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sectionId, commentId }) =>
      api.delete(`/feedback/sections/${sectionId}/comments/${commentId}`).then(res => res.data),
    onSuccess: (data, variables) => {
      // OPTIMIZED: Update batch cache directly
      queryClient.setQueryData(['projects', parseInt(variables.projectId), 'comments'], (old) => {
        if (!old || !old[variables.sectionId]) return old;
        return {
          ...old,
          [variables.sectionId]: old[variables.sectionId].filter(c => c.id !== variables.commentId)
        };
      });

      // Update individual cache
      queryClient.setQueryData(['sections', variables.sectionId, 'comments'], (old) => {
        return (old || []).filter(c => c.id !== variables.commentId);
      });
    },
    onError: (err) => {
      console.error('Failed to delete comment:', err);
    },
  });
};
