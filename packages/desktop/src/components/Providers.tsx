'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            // Increased retry for production reliability
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors (client errors)
              if (error?.statusCode >= 400 && error?.statusCode < 500) {
                return false;
              }
              // Retry up to 3 times for network errors and 5xx errors
              return failureCount < 3;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            // Retry mutations once on network errors
            retry: (failureCount, error: any) => {
              if (error?.retryable && failureCount < 1) {
                return true;
              }
              return false;
            },
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
