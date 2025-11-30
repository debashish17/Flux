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
      // Invalidate to trigger a single refetch
      queryClient.invalidateQueries({ queryKey: ['sections', variables.sectionId, 'comments'] });
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
      // Simply invalidate to trigger a single refetch
      queryClient.invalidateQueries({ queryKey: ['sections', variables.sectionId, 'comments'] });
    },
    onError: (err) => {
      console.error('Failed to delete comment:', err);
    },
  });
};
