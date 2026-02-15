import type { User } from './users';

export type TicketType = 'VIP' | 'Regular';
export type TransactionType = 'Bought' | 'Refunded';

export interface DashboardTransaction {
  id: string;
  type: TransactionType;
  ticketType: TicketType;
  amount: number;
  date: string;
}

export interface DashboardMetrics {
  seminarDate: string;
  registeredUsers: number;
  paidGuests: number;
  invitedGuests: number;
  invitedAccepted: number;
  invitedDeclined: number;
  vipSales: number;
  regularSales: number;
  totalSales: number;
  totalRevenue: number;
  revenueByTicketType: {
    VIP: {
      count: number;
      amount: number;
    };
    Regular: {
      count: number;
      amount: number;
    };
    total: {
      count: number;
      amount: number;
    };
  };
  registrationTrend: number[];
  transactions: DashboardTransaction[];
}

export const DASHBOARD_STATS = {
  seminarDate: '2026-03-25T09:00:00',
  ticketPrice: {
    VIP: 300,
    Regular: 100,
  },
  trendWeights: [0.12, 0.14, 0.13, 0.15, 0.14, 0.15, 0.17],
};

function buildRegistrationTrend(totalRegistrations: number): number[] {
  if (totalRegistrations <= 0) {
    return Array(7).fill(0);
  }

  const values = DASHBOARD_STATS.trendWeights.map((weight) =>
    Math.round(totalRegistrations * weight)
  );

  const currentSum = values.reduce((acc, value) => acc + value, 0);
  const delta = totalRegistrations - currentSum;

  values[values.length - 1] += delta;
  return values;
}

function inferVipSales(users: User[], totalRegistrations: number): number {
  if (totalRegistrations <= 0) return 0;
  if (users.length === 0) return Math.round(totalRegistrations * 0.35);

  const inPersonCount = users.filter((user) => user.attendanceType === 'In-Person').length;
  const ratio = inPersonCount / users.length;
  return Math.round(totalRegistrations * ratio);
}

export function buildDashboardMetrics(users: User[], totalUsers: number): DashboardMetrics {
  const registeredUsers = Math.max(totalUsers, users.length, 0);
  const vipSales = Math.min(inferVipSales(users, registeredUsers), registeredUsers);
  const regularSales = registeredUsers - vipSales;

  const paidGuests = registeredUsers;
  const invitedGuests = 0;
  const invitedAccepted = 0;
  const invitedDeclined = 0;
  const vipRevenue = vipSales * DASHBOARD_STATS.ticketPrice.VIP;
  const regularRevenue = regularSales * DASHBOARD_STATS.ticketPrice.Regular;
  const totalRevenue = vipRevenue + regularRevenue;

  const transactions: DashboardTransaction[] = users.slice(0, 12).map((user, index) => {
    const ticketType: TicketType = user.attendanceType === 'In-Person' ? 'VIP' : 'Regular';
    return {
      id: String(user.id),
      type: 'Bought',
      ticketType,
      amount: DASHBOARD_STATS.ticketPrice[ticketType],
      date: new Date(Date.now() - index * 60 * 60 * 1000).toISOString(),
    };
  });

  return {
    seminarDate: DASHBOARD_STATS.seminarDate,
    registeredUsers,
    paidGuests,
    invitedGuests,
    invitedAccepted,
    invitedDeclined,
    vipSales,
    regularSales,
    totalSales: vipSales + regularSales,
    totalRevenue,
    revenueByTicketType: {
      VIP: {
        count: vipSales,
        amount: vipRevenue,
      },
      Regular: {
        count: regularSales,
        amount: regularRevenue,
      },
      total: {
        count: vipSales + regularSales,
        amount: totalRevenue,
      },
    },
    registrationTrend: buildRegistrationTrend(registeredUsers),
    transactions,
  };
}
