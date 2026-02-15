import React, { useState } from 'react';
import { Header } from './components/Header';
import { Controls, KPIHeader } from './components/Controls';
import { RevenueHistory } from './components/revenue/RevenueHistory';
import { GuestTypeChart } from './components/revenue/GuestTypeChart';
import { DetailsSidebar } from './components/sidebar/DetailsSidebar';
import { UserTable } from './components/UserTable';
import { useDashboard } from './hooks/useDashboard';
import { TodoList } from './components/overview/TodoList';
import { MetricsList } from './components/overview/MetricsList';
import { InquiriesTab } from './components/inquiries/InquiriesTab';
import { TabOption } from './types';
import type { DashboardSidebarContent } from './data/dashboard';
import type { User } from './data/users';
import { INQUIRIES } from './data/inquiries';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabOption>(TabOption.Overview);
  const [activeDetail, setActiveDetail] = useState<DashboardSidebarContent | null>(null);
  const { users, isLoading, error, refetch, dashboard } = useDashboard();

  const now = new Date();
  const targetDate = new Date(dashboard.seminarDate);
  const diff = targetDate.getTime() - now.getTime();

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const getKPILabel = () => {
    switch (activeTab) {
      case TabOption.Revenue:
        return 'Total Revenue';
      case TabOption.Overview:
        return 'Time until Seminar';
      case TabOption.Inquiries:
        return 'Total Inquiries';
      default:
        return 'Registered Users';
    }
  };

  const getKPIValue = () => {
    switch (activeTab) {
      case TabOption.Revenue:
        return `GHS ${dashboard.totalRevenue.toLocaleString()}`;
      case TabOption.Overview:
        return `${days}d ${hours}h`;
      case TabOption.Inquiries:
        return INQUIRIES.length.toLocaleString();
      default:
        return dashboard.registeredUsers.toLocaleString();
    }
  };

  const handleUserSelect = (user: User) => {
    const selectedUser = dashboard.details.users.find((entry) => entry.id === user.id);
    if (!selectedUser) return;
    setActiveDetail({ kind: 'user', user: selectedUser });
  };

  return (
    <div className="min-h-screen bg-bgPrimary pb-12 font-sans selection:bg-slate-200">
      <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-8">
        <div className="rounded-none bg-bgPrimary sm:rounded-3xl">
          <Header />

          <main className="mt-8 px-2 sm:px-4">
            <Controls activeTab={activeTab} onTabChange={setActiveTab} />

            <KPIHeader label={getKPILabel()} value={getKPIValue()} isLoading={isLoading} />

            {activeTab === TabOption.Overview && (
              <div className="mb-8 grid h-[500px] grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="h-full lg:col-span-2">
                  <TodoList />
                </div>
                <div className="h-full">
                  <MetricsList dashboard={dashboard} onOpenDetail={setActiveDetail} />
                </div>
              </div>
            )}

            {activeTab === TabOption.Revenue && (
              <div className="mb-8 grid h-[500px] grid-cols-1 gap-6 lg:grid-cols-2">
                <GuestTypeChart dashboard={dashboard} />
                <RevenueHistory
                  transactions={dashboard.transactions}
                  revenueByTicketType={dashboard.revenueByTicketType}
                  ticketTypeDetails={dashboard.details.ticketTypes}
                  onOpenDetail={setActiveDetail}
                />
              </div>
            )}

            {activeTab === TabOption.Users && (
              <section className="mb-8">
                <UserTable
                  users={users}
                  isLoading={isLoading}
                  error={error}
                  onRetry={refetch}
                  onUserSelect={handleUserSelect}
                />
              </section>
            )}

            {activeTab === TabOption.Inquiries && (
              <section className="mb-8">
                <InquiriesTab onSelect={(inquiry) => setActiveDetail({ kind: 'inquiry', inquiry })} />
              </section>
            )}
          </main>
        </div>
      </div>

      <DetailsSidebar detail={activeDetail} onClose={() => setActiveDetail(null)} />
    </div>
  );
}
