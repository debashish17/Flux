import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

export const useAddSection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, title, content, insertAfter }) =>
      api.post(`/projects/${projectId}/sections`, { title, content, insertAfter }).then(res => res.data),
    onSuccess: (newSection, variables) => {
      // Add new section to cache
      queryClient.setQueryData(['projects', variables.projectId], (old) => {
        if (!old || !old.sections) return old;
        return {
          ...old,
          sections: [...old.sections, newSection],
        };
      });
    },
    onError: (err) => {
      console.error('Add section failed:', err);
    },
  });
};

export const useDeleteSection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sectionId, projectId }) =>
      api.delete(`/sections/${sectionId}`).then(res => res.data),
    onSuccess: (data, variables) => {
      // Remove section from cache
      queryClient.setQueryData(['projects', variables.projectId], (old) => {
        if (!old || !old.sections) return old;
        return {
          ...old,
          sections: old.sections.filter(s => s.id !== variables.sectionId),
        };
      });
    },
    onError: (err) => {
      console.error('Delete section failed:', err);
    },
  });
};

export const useReorderSection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sectionId, newOrderIndex, projectId }) =>
      api.patch(`/sections/${sectionId}/reorder`, { newOrderIndex }).then(res => res.data),
    onSuccess: (data, variables) => {
      // Update cache with backend response - no need to invalidate
      queryClient.setQueryData(['projects', variables.projectId], (old) => {
        if (!old || !old.sections) return old;

        // Use backend's updated section order
        const idx = old.sections.findIndex(s => s.id === variables.sectionId);
        if (idx === -1) return old;

        const newSections = [...old.sections];
        const [removed] = newSections.splice(idx, 1);
        newSections.splice(variables.newOrderIndex, 0, removed);

        return {
          ...old,
          sections: newSections,
        };
      });
    },
    onError: (err) => {
      console.error('Reorder failed:', err);
    },
  });
};

export const useUpdateSection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sectionId, updates, projectId }) =>
      api.patch(`/sections/${sectionId}`, updates).then(res => res.data),
    onSuccess: (updatedSection, variables) => {
      // Update cache directly with backend response
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
      console.error('Update section failed:', err);
    },
  });
};
