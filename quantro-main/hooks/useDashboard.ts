import { useMemo } from 'react';
import { buildDashboardMetrics } from '../data/dashboard';
import { useUsers } from './useUsers';
import type { UsersQuery } from '../services/usersApi';

export function useDashboard(query: UsersQuery = {}) {
  const usersState = useUsers(query);

  const dashboard = useMemo(
    () => buildDashboardMetrics(usersState.users, usersState.total),
    [usersState.total, usersState.users]
  );

  return {
    ...usersState,
    dashboard,
  };
}
