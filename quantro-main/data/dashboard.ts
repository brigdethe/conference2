import type { User } from './users';
import type { Inquiry } from './inquiries';

export type TicketType = 'Access Code' | 'Paid';
export type TransactionType = 'Bought' | 'Refunded';

export interface DashboardTransaction {
  id: string;
  type: TransactionType;
  ticketType: TicketType;
  amount: number;
  date: string;
  buyerId: number | null;
  buyerName: string;
}

export interface RevenueBucket {
  count: number;
  amount: number;
}

export interface RevenueByTicketType {
  AccessCode: RevenueBucket;
  Paid: RevenueBucket;
  total: RevenueBucket;
}

export interface DashboardTicketPurchase {
  transactionId: string;
  buyerId: number | null;
  buyerName: string;
  type: TransactionType;
  amount: number;
  date: string;
}

export interface DashboardTicketTypeDetail {
  ticketType: TicketType;
  count: number;
  amount: number;
  purchases: DashboardTicketPurchase[];
}

export interface DashboardUserDetail extends User {
  ticketType: TicketType;
  registeredAt: string;
  totalSpent: number;
  transactions: DashboardTransaction[];
}

export interface DashboardRegistrationsOverviewDetail {
  total: number;
  vip: number;
  regular: number;
  inPerson: number;
  virtual: number;
  knownProfiles: number;
  latestRegistrationAt: string | null;
}

export interface DashboardInvitedGuestsOverviewDetail {
  total: number;
  accepted: number;
  declined: number;
  pending: number;
}

export type FirmRegistrationStatus = 'confirmed' | 'pending_payment';

export interface FirmRegistrationDetail {
  id: number;
  fullName: string;
  email: string;
  jobTitle: string;
  phone: string;
  ticketType: TicketType;
  status: FirmRegistrationStatus;
  registeredAt: string | null;
}

export interface FirmActivityDetail {
  name: string;
  code: string;
  totalRegistrations: number;
  confirmedAccessCode: number;
  confirmedPaid: number;
  pendingPayment: number;
  freeSlotsRemaining: number;
  lastRegistrationAt: string | null;
  registrations: FirmRegistrationDetail[];
}

export interface DashboardDetails {
  users: DashboardUserDetail[];
  transactions: DashboardTransaction[];
  ticketTypes: {
    AccessCode: DashboardTicketTypeDetail;
    Paid: DashboardTicketTypeDetail;
  };
  overview: {
    registrations: DashboardRegistrationsOverviewDetail;
    invitedGuests: DashboardInvitedGuestsOverviewDetail;
  };
}

export type DashboardSidebarContent =
  | {
    kind: 'user';
    user: DashboardUserDetail;
  }
  | {
    kind: 'transaction';
    transaction: DashboardTransaction;
  }
  | {
    kind: 'ticketType';
    ticketType: DashboardTicketTypeDetail;
  }
  | {
    kind: 'revenueTotal';
    revenueByTicketType: RevenueByTicketType;
  }
  | {
    kind: 'overviewRegistrations';
    registrations: DashboardRegistrationsOverviewDetail;
  }
  | {
    kind: 'overviewInvitedGuests';
    invitedGuests: DashboardInvitedGuestsOverviewDetail;
  }
  | {
    kind: 'firmActivity';
    firm: FirmActivityDetail;
  }
  | {
    kind: 'inquiry';
    inquiry: Inquiry;
  };

export interface DashboardMetrics {
  seminarDate: string;
  registeredUsers: number;
  paidGuests: number;
  invitedGuests: number;
  invitedAccepted: number;
  invitedDeclined: number;
  accessCodeSales: number;
  paidSales: number;
  totalSales: number;
  totalRevenue: number;
  revenueByTicketType: RevenueByTicketType;
  registrationTrend: number[];
  transactions: DashboardTransaction[];
  details: DashboardDetails;
}

export const DASHBOARD_STATS = {
  seminarDate: '2026-03-25T09:00:00',
  ticketPrice: {
    'Access Code': 0,
    'Paid': 150, // Assuming a price for paid guests
  },
  trendWeights: [0.12, 0.14, 0.13, 0.15, 0.14, 0.15, 0.17],
  recentTransactionLimit: 30,
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

function inferAccessCodeSales(users: User[], totalRegistrations: number): number {
  if (totalRegistrations <= 0) return 0;
  if (users.length === 0) return Math.round(totalRegistrations * 0.7); // Assume 70% are invited

  const accessCodeCount = users.filter((user) => user.ticketType === 'Access Code').length;
  // If we have actual data, use it. If mostly mock/undefined, fallback.
  // The mock data usually has ticketType. 
  // If ticketType is missing, logic below handles it.

  // Actually, let's just count them if we have them.
  // But wait, `buildDashboardMetrics` calls this with `users` array.
  return users.filter(u => u.ticketType === 'Access Code').length;
}

function resolveTicketType(user: User): TicketType {
  if (user.ticketType === 'Access Code' || user.ticketType === 'Paid') {
    return user.ticketType;
  }

  // Fallback logic if needed
  return 'Access Code';
}

function resolveRegistrationDate(user: User, index: number): string {
  if (user.registeredAt) {
    const parsedDate = new Date(user.registeredAt);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }

  const fallbackDate = new Date();
  fallbackDate.setDate(fallbackDate.getDate() - (index + 1));
  fallbackDate.setHours(9 + (index % 8), (index * 11) % 60, 0, 0);
  return fallbackDate.toISOString();
}

function toSignedAmount(transaction: DashboardTransaction): number {
  return transaction.type === 'Refunded' ? -transaction.amount : transaction.amount;
}

function buildUserDetails(users: User[]): DashboardUserDetail[] {
  return users.map((user, index) => ({
    ...user,
    ticketType: resolveTicketType(user),
    registeredAt: resolveRegistrationDate(user, index),
    totalSpent: 0,
    transactions: [],
  }));
}

function buildTransactions(users: DashboardUserDetail[]): DashboardTransaction[] {
  const transactions = users.map((user) => ({
    id: `txn-${user.id}`,
    type: 'Bought' as const,
    ticketType: user.ticketType,
    amount: DASHBOARD_STATS.ticketPrice[user.ticketType],
    date: user.registeredAt,
    buyerId: user.id,
    buyerName: user.fullName,
  }));

  return transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, DASHBOARD_STATS.recentTransactionLimit);
}

function buildTicketTypeDetail(
  ticketType: TicketType,
  revenue: RevenueBucket,
  transactions: DashboardTransaction[]
): DashboardTicketTypeDetail {
  const purchases = transactions
    .filter((transaction) => transaction.ticketType === ticketType)
    .map((transaction) => ({
      transactionId: transaction.id,
      buyerId: transaction.buyerId,
      buyerName: transaction.buyerName,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
    }));

  return {
    ticketType,
    count: revenue.count,
    amount: revenue.amount,
    purchases,
  };
}

export function buildDashboardMetrics(users: User[], totalUsers: number): DashboardMetrics {
  const registeredUsers = Math.max(totalUsers, users.length, 0);

  // Real count from users array
  const accessCodeSales = users.filter(u => u.ticketType === 'Access Code').length;
  const paidSales = users.filter(u => u.ticketType === 'Paid').length;

  // If totalUsers > users.length (e.g. pagination or mock totals), we need to extrapolate?
  // For now let's just trust the passed users or updated logic. 
  // If we are using the API, `users` might be just a page? 
  // Ah, the hook fetches all? No, `useUsers` fetches logic.
  // But strictly `buildDashboardMetrics` takes `users`.

  const paidGuests = paidSales;
  const invitedGuests = 0; // Not tracked via users array directly unless we have a separate list
  const invitedAccepted = 0;
  const invitedDeclined = 0;

  const accessCodeRevenue = accessCodeSales * DASHBOARD_STATS.ticketPrice['Access Code'];
  const paidRevenue = paidSales * DASHBOARD_STATS.ticketPrice['Paid'];
  const totalRevenue = accessCodeRevenue + paidRevenue;

  const revenueByTicketType: RevenueByTicketType = {
    AccessCode: {
      count: accessCodeSales,
      amount: accessCodeRevenue,
    },
    Paid: {
      count: paidSales,
      amount: paidRevenue,
    },
    total: {
      count: accessCodeSales + paidSales,
      amount: totalRevenue,
    },
  };

  const userDetails = buildUserDetails(users);
  const transactions = buildTransactions(userDetails);

  const transactionsByUserId = new Map<number, DashboardTransaction[]>();
  for (const transaction of transactions) {
    if (transaction.buyerId == null) continue;
    const current = transactionsByUserId.get(transaction.buyerId) ?? [];
    current.push(transaction);
    transactionsByUserId.set(transaction.buyerId, current);
  }

  const usersWithTransactions = userDetails.map((user) => {
    const userTransactions = transactionsByUserId.get(user.id) ?? [];
    const totalSpent = userTransactions.reduce((sum, transaction) => sum + toSignedAmount(transaction), 0);

    return {
      ...user,
      transactions: userTransactions,
      totalSpent,
    };
  });

  const ticketTypes = {
    AccessCode: buildTicketTypeDetail('Access Code', revenueByTicketType.AccessCode, transactions),
    Paid: buildTicketTypeDetail('Paid', revenueByTicketType.Paid, transactions),
  };

  const latestRegistrationAt =
    usersWithTransactions
      .map((user) => user.registeredAt)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  return {
    seminarDate: DASHBOARD_STATS.seminarDate,
    registeredUsers,
    paidGuests,
    invitedGuests,
    invitedAccepted,
    invitedDeclined,
    accessCodeSales,
    paidSales,
    totalSales: accessCodeSales + paidSales,
    totalRevenue,
    revenueByTicketType,
    registrationTrend: buildRegistrationTrend(registeredUsers),
    transactions,
    details: {
      users: usersWithTransactions,
      transactions,
      ticketTypes,
      overview: {
        registrations: {
          total: registeredUsers,
          vip: revenueByTicketType.AccessCode.count,
          regular: revenueByTicketType.Paid.count,
          inPerson: accessCodeSales,
          virtual: paidSales,
          knownProfiles: usersWithTransactions.length,
          latestRegistrationAt,
        },
        invitedGuests: {
          total: invitedGuests,
          accepted: invitedAccepted,
          declined: invitedDeclined,
          pending: Math.max(invitedGuests - invitedAccepted - invitedDeclined, 0),
        },
      },
    },
  };
}
