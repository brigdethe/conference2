import { mockUsers, type User } from '../data/users';

export interface UsersResult {
  users: User[];
  total: number;
  source: 'mock' | 'api';
}

export interface UsersQuery {
  page?: number;
  limit?: number;
  search?: string;
}

const API_BASE_URL = (import.meta.env.VITE_USERS_API_BASE_URL as string | undefined)?.trim();
const USERS_ENDPOINT = (import.meta.env.VITE_USERS_ENDPOINT as string | undefined)?.trim() || '/users';

function toAttendanceType(value: unknown): User['attendanceType'] {
  if (typeof value !== 'string') return 'Virtual';
  const normalized = value.toLowerCase();
  return normalized.includes('in') ? 'In-Person' : 'Virtual';
}

function toTicketType(value: unknown): User['ticketType'] {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase();

  // Backend returns 'Free/VIP' for confirmed access code users
  if (normalized.includes('vip') || normalized.includes('free')) return 'Access Code';

  // Backend returns 'Pending Payment' for paid users (or similar)
  if (normalized.includes('pending') || normalized.includes('paid')) return 'Paid';

  return 'Access Code'; // Default fallback
}

function toDateString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeUser(raw: Record<string, unknown>, index: number): User {
  const attendanceType = toAttendanceType(
    raw.attendanceType ?? raw.attendance_type ?? raw.attendance
  );
  const ticketType = toTicketType(raw.ticketType ?? raw.ticket_type ?? raw.ticket) ??
    (attendanceType === 'In-Person' ? 'VIP' : 'Regular');

  return {
    id: Number(raw.id ?? raw.userId ?? index + 1),
    fullName: toStringValue(raw.fullName ?? raw.name ?? raw.full_name) || `User ${index + 1}`,
    jobTitle: toStringValue(raw.jobTitle ?? raw.job_title),
    lawFirm: toStringValue(raw.lawFirm ?? raw.firm ?? raw.company),
    email: toStringValue(raw.email),
    phone: toStringValue(raw.phone ?? raw.phoneNumber ?? raw.phone_number),
    attendanceType,
    ticketType,
    registeredAt: toDateString(
      raw.registeredAt ??
      raw.registered_at ??
      raw.registrationDate ??
      raw.registration_date ??
      raw.createdAt ??
      raw.created_at
    ),
  };
}

function normalizePayload(payload: unknown): UsersResult {
  if (Array.isArray(payload)) {
    const users = payload.map((item, index) => normalizeUser((item ?? {}) as Record<string, unknown>, index));
    return { users, total: users.length, source: 'api' };
  }

  const container = (payload ?? {}) as Record<string, unknown>;
  const rawUsers =
    (Array.isArray(container.users) && container.users) ||
    (Array.isArray(container.data) && container.data) ||
    (Array.isArray(container.items) && container.items) ||
    [];

  const users = rawUsers.map((item, index) => normalizeUser((item ?? {}) as Record<string, unknown>, index));
  const total = Number(container.total ?? container.count ?? users.length);

  return { users, total: Number.isFinite(total) ? total : users.length, source: 'api' };
}

function createUsersUrl(query: UsersQuery = {}): string {
  const search = query.search?.trim();

  const url = new URL(USERS_ENDPOINT, `${API_BASE_URL}/`);
  if (typeof query.page === 'number') {
    url.searchParams.set('page', String(query.page));
  }
  if (typeof query.limit === 'number') {
    url.searchParams.set('limit', String(query.limit));
  }
  if (search) url.searchParams.set('search', search);
  return url.toString();
}

export async function fetchUsers(query: UsersQuery = {}, signal?: AbortSignal): Promise<UsersResult> {
  // Use local API by default if not specified
  const endpoint = API_BASE_URL ? createUsersUrl(query) : '/api/users';

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to load users: ${response.status}`);
    }

    const payload = await response.json();
    return normalizePayload(payload);
  } catch (error) {
    console.warn('API fetch failed, falling back to mock data', error);
    return {
      users: mockUsers,
      total: mockUsers.length,
      source: 'mock',
    };
  }
}


