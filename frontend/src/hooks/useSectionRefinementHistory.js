import { useQuery } from '@tanstack/react-query';
import api from '../api';

export function useSectionRefinementHistory(sectionId) {
  return useQuery({
    queryKey: ['sections', sectionId, 'refinementHistory'],
    queryFn: () => api.get(`/sections/${sectionId}/refinement-history`).then(res => res.data),
    enabled: !!sectionId,
  });
}
