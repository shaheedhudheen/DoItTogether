import { QueryClient } from '@tanstack/react-query';

/**
 * One cache instance for the whole app. It is exported so auth transitions
 * (login/register/logout, including forced logout after a failed refresh) can
 * wipe every cached query — otherwise a new account could briefly see the
 * previous account's user/partnership data.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000
    }
  }
});
