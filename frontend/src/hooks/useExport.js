import { useMutation } from '@tanstack/react-query';
import api from '../api';

export const useExportProject = () => {
  return useMutation({
    mutationFn: ({ projectId }) =>
      api.get(`/export/${projectId}`, { responseType: 'blob' }).then(res => res.data),
    onSuccess: (blob, variables) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${variables.title}.${variables.type}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onError: (err) => {
      console.error('Export failed:', err);
    },
  });
};
