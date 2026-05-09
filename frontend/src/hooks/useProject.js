import { useQuery } from '@tanstack/react-query';
import api from '../api';

export const useProject = (projectId) => {
  return useQuery({
    queryKey: ['projects', parseInt(projectId)],
    queryFn: () => api.get(`/projects/${projectId}`).then(res => res.data),
    enabled: !!projectId,
    staleTime: 10000, // 10 seconds - more frequent updates
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes after disuse
    refetchOnWindowFocus: true, // Refresh when returning to tab
    refetchOnMount: false,
    refetchOnReconnect: true, // Refresh after connection restored
    retry: 2, // Retry failed requests twice
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

export const useProjectFeedback = (projectId) => {
  return useQuery({
    queryKey: ['projects', parseInt(projectId), 'feedback'],
    queryFn: () => api.get(`/feedback/projects/${projectId}/batch`).then(res => res.data),
    enabled: !!projectId,
    staleTime: 60_000, // 1 min — mutations update cache directly, no need to refetch eagerly
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useProjectComments = (projectId) => {
  return useQuery({
    queryKey: ['projects', parseInt(projectId), 'comments'],
    queryFn: () => api.get(`/feedback/projects/${projectId}/comments`).then(res => res.data),
    enabled: !!projectId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
