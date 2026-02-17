import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '../data/users';
import { fetchUsers, type UsersQuery } from '../services/usersApi';

interface UseUsersResult {
  users: User[];
  total: number;
  isLoading: boolean;
  error: string | null;
  source: 'mock' | 'api';
  refetch: () => void;
}

export function useUsers(query: UsersQuery = {}): UseUsersResult {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState<'mock' | 'api'>('mock');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const stableQuery = useMemo(
    () => ({
      page: query.page,
      limit: query.limit,
      search: query.search?.trim() || undefined,
    }),
    [query.limit, query.page, query.search]
  );

  const refetch = useCallback(() => {
    setReloadToken((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchUsers(stableQuery, controller.signal);
        if (cancelled) return;
        setUsers(result.users);
        setTotal(result.total);
        setSource(result.source);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        const message = err instanceof Error ? err.message : 'Unable to fetch users';
        setUsers([]);
        setTotal(0);
        setSource('api');
        setError(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadToken, stableQuery]);

  return { users, total, isLoading, error, source, refetch };
}
