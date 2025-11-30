import { useQuery } from '@tanstack/react-query';
import api from '../api';

export const useProject = (projectId) => {
  return useQuery({
    queryKey: ['projects', parseInt(projectId)],
    queryFn: () => api.get(`/projects/${projectId}`).then(res => res.data),
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds (reduced for faster updates)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

export const useProjectFeedback = (projectId) => {
  return useQuery({
    queryKey: ['projects', projectId, 'feedback'],
    queryFn: () => api.get(`/feedback/projects/${projectId}/batch`).then(res => res.data),
    enabled: !!projectId,
  });
};

export const useProjectComments = (projectId) => {
  return useQuery({
    queryKey: ['projects', projectId, 'comments'],
    queryFn: () => api.get(`/feedback/projects/${projectId}/comments`).then(res => res.data),
    enabled: !!projectId,
  });
};
