import React, { useState } from 'react';
import { Header } from './components/Header';
import { Controls, KPIHeader } from './components/Controls';
// import { UserGrowthChart } from './components/charts/UserGrowthChart';
// import { DeviceTrafficChart } from './components/charts/DeviceTrafficChart';
// import { IncomeChart } from './components/charts/IncomeChart';
import { RevenueHistory } from './components/revenue/RevenueHistory';
import { GuestTypeChart } from './components/revenue/GuestTypeChart';
import { UserTable } from './components/UserTable';
import { useUsers } from './hooks/useUsers';


import { TabOption } from './types';

import { DASHBOARD_STATS } from './data/dashboard';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabOption>(TabOption.Users);
  const { users, total, isLoading, error, refetch } = useUsers();

  const now = new Date();
  const targetDate = new Date(DASHBOARD_STATS.seminarDate); // Using centralized date
  const diff = targetDate.getTime() - now.getTime();

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const getKPILabel = () => {
    switch (activeTab) {
      case TabOption.Revenue: return "Total Revenue";
      case TabOption.Projects: return "Time until Seminar";
      default: return "Registered Users";
    }
  };

  const getKPIValue = () => {
    switch (activeTab) {
      case TabOption.Revenue: return "₵1,000";
      case TabOption.Projects: return `${days}d ${hours}h`;
      default: return total.toLocaleString();
    }
  };

  return (
    <div className="min-h-screen bg-bgPrimary pb-12 font-sans selection:bg-slate-200">
      <div className="max-w-[1280px] mx-auto pt-6 px-4 sm:px-8">
        {/* Main Content Card Wrapper */}
        <div className="bg-bgPrimary rounded-none sm:rounded-3xl">
          <Header />

          <main className="mt-8 px-2 sm:px-4">
            <Controls activeTab={activeTab} onTabChange={setActiveTab} />

            <KPIHeader
              label={getKPILabel()}
              value={getKPIValue()}
              isLoading={isLoading}
            />

            {activeTab === TabOption.Revenue && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px] mb-8">
                {/* Left Column - Charts Placeholder */}
                {/* Left Column - Guest Type Chart */}
                <GuestTypeChart />

                {/* Right Column - Revenue History */}
                <RevenueHistory />
              </div>
            )}

            {activeTab === TabOption.Users && (
              <section className="mb-8">
                <UserTable
                  users={users}
                  isLoading={isLoading}
                  error={error}
                  onRetry={refetch}
                />
              </section>
            )}


          </main>
        </div>
      </div>
    </div>
  );
}
