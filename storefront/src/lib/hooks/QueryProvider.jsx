/**
 * React Query Provider
 * Wraps the app to enable React Query hooks
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Query Client Provider Component
 * Use this to wrap your app in layout.js
 */
export function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 0,
            staleTime: 10 * 60 * 1000,  // 10 min — data stays fresh
            gcTime: 30 * 60 * 1000,     // 30 min — keep cache alive longer
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}