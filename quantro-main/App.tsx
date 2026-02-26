import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Controls, KPIHeader } from './components/Controls';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { DetailsSidebar } from './components/sidebar/DetailsSidebar';
import { UserTable } from './components/UserTable';
import { useDashboard } from './hooks/useDashboard';
import { FirmsTab } from './components/firms/FirmsTab';
import { TicketsTab } from './components/tickets/TicketsTab';
import { SettingsTab } from './components/settings/SettingsTab';
import { InquiriesTab } from './components/inquiries/InquiriesTab';
import { RegistrationsTab } from './components/approvals/ApprovalsTab';
import { Login } from './components/Login';
import { TabOption } from './types';
import type { DashboardSidebarContent } from './data/dashboard';
import type { FirmActivityDetail, FirmRegistrationDetail } from './data/dashboard';
import type { User } from './data/users';

function normalizeFirmRegistration(raw: Record<string, unknown>): FirmRegistrationDetail {
  return {
    id: Number(raw.id ?? 0),
    fullName: String(raw.fullName ?? raw.full_name ?? ''),
    email: String(raw.email ?? ''),
    jobTitle: String(raw.jobTitle ?? raw.job_title ?? ''),
    phone: String(raw.phone ?? ''),
    ticketType: (raw.ticketType ?? raw.ticket_type ?? 'Access Code') as FirmRegistrationDetail['ticketType'],
    status: String(raw.status ?? 'confirmed') as FirmRegistrationDetail['status'],
    registeredAt: (raw.registeredAt ?? raw.registered_at ?? raw.created_at ?? null) as string | null,
  };
}

function normalizeFirmActivity(raw: Record<string, unknown>): FirmActivityDetail {
  const rawRegs = Array.isArray(raw.registrations) ? raw.registrations : [];
  return {
    name: String(raw.name ?? ''),
    code: String(raw.code ?? ''),
    totalRegistrations: Number(raw.totalRegistrations ?? raw.total_registrations ?? 0),
    confirmedAccessCode: Number(raw.confirmedAccessCode ?? raw.confirmed_access_code ?? 0),
    confirmedPaid: Number(raw.confirmedPaid ?? raw.confirmed_paid ?? 0),
    pendingPayment: Number(raw.pendingPayment ?? raw.pending_payment ?? 0),
    freeSlotsRemaining: Number(raw.freeSlotsRemaining ?? raw.free_slots_remaining ?? 0),
    lastRegistrationAt: (raw.lastRegistrationAt ?? raw.last_registration_at ?? null) as string | null,
    registrations: rawRegs.map((r: Record<string, unknown>) => normalizeFirmRegistration(r ?? {})),
  };
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabOption>(TabOption.Dashboard);
  const [activeDetail, setActiveDetail] = useState<DashboardSidebarContent | null>(null);
  const { users, isLoading, error, refetch, dashboard } = useDashboard();
  const [selectedFirm, setSelectedFirm] = useState<string>('All');
  const [invitedFirms, setInvitedFirms] = useState<FirmActivityDetail[]>([]);
  const [firmsLoading, setFirmsLoading] = useState(true);
  const [firmsError, setFirmsError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const localAuth = localStorage.getItem('adminAuth');
      if (!localAuth) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const res = await fetch('/api/admin/check', { credentials: 'include' });
        const data = await res.json();
        setIsAuthenticated(data.authenticated === true);
        if (!data.authenticated) {
          localStorage.removeItem('adminAuth');
        }
      } catch {
        setIsAuthenticated(false);
        localStorage.removeItem('adminAuth');
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    localStorage.removeItem('adminAuth');
    setIsAuthenticated(false);
  };

  const fetchInvitedFirms = React.useCallback(async () => {
    setFirmsLoading(true);
    setFirmsError(null);

    try {
      const res = await fetch('/api/firms/activity', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false);
          localStorage.removeItem('adminAuth');
          return;
        }
        throw new Error(`Failed to load firms: ${res.status}`);
      }

      const data = await res.json();
      const rawFirms = Array.isArray(data?.firms) ? data.firms : [];
      setInvitedFirms(rawFirms.map((f: Record<string, unknown>) => normalizeFirmActivity(f ?? {})));
    } catch (err) {
      console.error('Failed to fetch firm activities:', err);
      setInvitedFirms([]);
      setFirmsError(err instanceof Error ? err.message : 'Unable to load firm activities');
    } finally {
      setFirmsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchInvitedFirms();
    }
  }, [fetchInvitedFirms, isAuthenticated]);

  const firms = React.useMemo(() => {
    const names = new Set<string>();
    invitedFirms.forEach((firm) => names.add(firm.name));
    users.forEach((user) => {
      if (user.lawFirm) names.add(user.lawFirm);
    });
    return Array.from(names).sort();
  }, [invitedFirms, users]);

  React.useEffect(() => {
    if (selectedFirm !== 'All' && !firms.includes(selectedFirm)) {
      setSelectedFirm('All');
    }
  }, [firms, selectedFirm]);

  const filteredUsers = React.useMemo(() => {
    if (selectedFirm === 'All') return users;
    return users.filter((u) => u.lawFirm === selectedFirm);
  }, [users, selectedFirm]);

  const now = new Date();
  const targetDate = new Date(dashboard.seminarDate);
  const diff = targetDate.getTime() - now.getTime();

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const getKPILabel = () => {
    switch (activeTab) {
      case TabOption.Dashboard:
        return 'Time until Seminar';
      case TabOption.Firms:
        return 'Total Firms';
      case TabOption.CheckIn:
        return 'Active Tickets';
      case TabOption.Registrations:
        return 'Pending Registrations';
      case TabOption.Inquiries:
        return 'Inquiries';
      case TabOption.Settings:
        return 'Configuration';
      case TabOption.Attendees:
        return 'Total Attendees';
      default:
        return 'Total Attendees';
    }
  };

  const getKPIValue = () => {
    switch (activeTab) {
      case TabOption.Dashboard:
        return `${days}d ${hours}h`;
      case TabOption.Firms:
        return invitedFirms.length.toLocaleString();
      case TabOption.CheckIn:
        return dashboard.registeredUsers.toLocaleString();
      case TabOption.Registrations:
        return '';
      case TabOption.Inquiries:
        return '';
      case TabOption.Settings:
        return '';
      case TabOption.Attendees:
        return dashboard.registeredUsers.toLocaleString();
      default:
        return dashboard.registeredUsers.toLocaleString();
    }
  };

  const handleUserSelect = (user: User) => {
    const selectedUser = dashboard.details.users.find((entry) => entry.id === user.id);
    if (!selectedUser) return;
    setActiveDetail({ kind: 'user', user: selectedUser });
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-bgPrimary flex items-center justify-center">
        <div className="text-textSecondary">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-bgPrimary pb-12 font-sans selection:bg-slate-200">
      <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-8">
        <div className="rounded-none bg-bgPrimary sm:rounded-3xl">
          <Header onLogout={handleLogout} />

          <main className="mt-8 px-2 sm:px-4">
            <Controls activeTab={activeTab} onTabChange={setActiveTab} />

            <KPIHeader label={getKPILabel()} value={getKPIValue()} isLoading={isLoading} />

            {activeTab === TabOption.Dashboard && (
              <DashboardTab
                dashboard={dashboard}
                invitedFirms={invitedFirms}
                firmsLoading={firmsLoading}
                firmsError={firmsError}
                onRetryFirms={fetchInvitedFirms}
                onOpenDetail={setActiveDetail}
              />
            )}

            {activeTab === TabOption.Attendees && (
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <button
                    onClick={() => {
                      const csvRows = [
                        ['Name', 'Email', 'Phone', 'Job Title', 'Organization', 'Ticket Type', 'Registered At'].join(','),
                        ...filteredUsers.map(u => [
                          `"${(u.fullName || '').replace(/"/g, '""')}"`,
                          `"${(u.email || '').replace(/"/g, '""')}"`,
                          `"${(u.phone || '').replace(/"/g, '""')}"`,
                          `"${(u.jobTitle || '').replace(/"/g, '""')}"`,
                          `"${(u.organization || u.lawFirm || u.company || '').replace(/"/g, '""')}"`,
                          `"${(u.ticketType || '').replace(/"/g, '""')}"`,
                          `"${(u.registeredAt || '').replace(/"/g, '""')}"`
                        ].join(','))
                      ];
                      const csvContent = csvRows.join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `attendees-${new Date().toISOString().split('T')[0]}.csv`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export CSV
                  </button>
                  <div className="relative">
                    <select
                      value={selectedFirm}
                      onChange={(e) => setSelectedFirm(e.target.value)}
                      className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-4 pr-10 text-sm font-medium text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="All">All Law Firms</option>
                      {firms.map((firm) => (
                        <option key={firm} value={firm}>
                          {firm}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <UserTable
                  users={filteredUsers}
                  isLoading={isLoading}
                  error={error}
                  onRetry={refetch}
                  onUserSelect={handleUserSelect}
                  onDelete={async (userId) => {
                    try {
                      const res = await fetch(`/api/registrations/${userId}`, {
                        method: 'DELETE',
                        credentials: 'include',
                      });
                      if (res.ok) {
                        refetch();
                      } else {
                        const data = await res.json();
                        alert(data.detail || data.error || 'Failed to delete');
                      }
                    } catch (err) {
                      alert('Failed to delete registration');
                    }
                  }}
                />
              </section>
            )}

            {activeTab === TabOption.Firms && (
              <section className="mb-8">
                <FirmsTab onFirmCreated={fetchInvitedFirms} />
              </section>
            )}

            {activeTab === TabOption.CheckIn && (
              <section className="mb-8">
                <TicketsTab />
              </section>
            )}

            {activeTab === TabOption.Registrations && (
              <section className="mb-8">
                <RegistrationsTab />
              </section>
            )}

            {activeTab === TabOption.Inquiries && (
              <section className="mb-8">
                <InquiriesTab onSelect={(inquiry) => setActiveDetail({ kind: 'inquiry', inquiry })} />
              </section>
            )}

            {activeTab === TabOption.Settings && (
              <section className="mb-8">
                <SettingsTab />
              </section>
            )}
          </main>
        </div>
      </div>

      <DetailsSidebar detail={activeDetail} onClose={() => setActiveDetail(null)} />
    </div>
  );
}
