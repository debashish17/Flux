import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

export const useGenerateFullDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId }) =>
      api.post(`/projects/${projectId}/generate-full-document`).then(res => res.data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch the project to get updated sections
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] });
    },
    onError: (err) => {
      console.error('Generate full document failed:', err);
    },
  });
};

export const useGenerateSection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sectionId, prompt, projectId }) =>
      api.post(`/generate/section/${sectionId}`, { prompt }).then(res => res.data),
    onSuccess: (updatedSection, variables) => {
      // Update specific section in cache
      queryClient.setQueryData(['projects', variables.projectId], (old) => {
        if (!old || !old.sections) return old;
        return {
          ...old,
          sections: old.sections.map(s =>
            s.id === variables.sectionId ? { ...s, ...updatedSection } : s
          ),
        };
      });
    },
    onError: (err) => {
      console.error('Generate section failed:', err);
    },
  });
};

export const useRefineSection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sectionId, instruction, projectId }) =>
      api.post(`/generate/refine/${sectionId}`, { instruction }).then(res => res.data),
    onSuccess: (updatedSection, variables) => {
      // Update specific section in cache
      queryClient.setQueryData(['projects', variables.projectId], (old) => {
        if (!old || !old.sections) return old;
        return {
          ...old,
          sections: old.sections.map(s =>
            s.id === variables.sectionId ? { ...s, ...updatedSection } : s
          ),
        };
      });
    },
    onError: (err) => {
      console.error('Refine section failed:', err);
    },
  });
};

export const useRegenerateWithFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sectionId, feedback, projectId }) =>
      api.post(`/feedback/sections/${sectionId}/regenerate`, { feedback }).then(res => res.data),
    onSuccess: async (updatedSection, variables) => {
      // Update section in cache with the full updated section from backend
      queryClient.setQueryData(['projects', variables.projectId], (old) => {
        if (!old || !old.sections) return old;
        return {
          ...old,
          sections: old.sections.map(s =>
            s.id === variables.sectionId ? { ...s, ...updatedSection } : s
          ),
        };
      });

      // Clear feedback and comments for this section
      queryClient.setQueryData(['sections', variables.sectionId, 'feedback'], null);
      queryClient.setQueryData(['sections', variables.sectionId, 'comments'], []);
      await queryClient.refetchQueries({ queryKey: ['sections', variables.sectionId, 'feedback'] });
      await queryClient.refetchQueries({ queryKey: ['sections', variables.sectionId, 'comments'] });
    },
    onError: (err) => {
      console.error('Regenerate with feedback failed:', err);
    },
  });
};
