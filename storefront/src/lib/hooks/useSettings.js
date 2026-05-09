import { useQuery } from '@tanstack/react-query';
import { getSettings } from '@/lib/api/settings';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    staleTime: 5 * 60 * 1000,
  });
}
