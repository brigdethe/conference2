import React from 'react';
import { InvitedFirmsList } from '../overview/InvitedFirmsList';
import { MetricsList } from '../overview/MetricsList';
import { GuestTypeChart } from '../revenue/GuestTypeChart';
import { RevenueHistory } from '../revenue/RevenueHistory';
import type { DashboardMetrics, DashboardSidebarContent, FirmActivityDetail } from '../../data/dashboard';

interface DashboardTabProps {
  dashboard: DashboardMetrics;
  invitedFirms: FirmActivityDetail[];
  firmsLoading: boolean;
  firmsError: string | null;
  onRetryFirms: () => void;
  onOpenDetail: (detail: DashboardSidebarContent) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  dashboard,
  invitedFirms,
  firmsLoading,
  firmsError,
  onRetryFirms,
  onOpenDetail,
}) => {
  return (
    <div className="space-y-6 mb-8">
      <div className="grid h-[500px] grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-full lg:col-span-2">
          <InvitedFirmsList
            firms={invitedFirms}
            isLoading={firmsLoading}
            error={firmsError}
            onRetry={onRetryFirms}
            onOpenDetail={onOpenDetail}
          />
        </div>
        <div className="h-full">
          <MetricsList dashboard={dashboard} onOpenDetail={onOpenDetail} />
        </div>
      </div>

      <div className="grid h-[500px] grid-cols-1 gap-6 lg:grid-cols-2">
        <GuestTypeChart dashboard={dashboard} />
        <RevenueHistory
          transactions={dashboard.transactions}
          revenueByTicketType={dashboard.revenueByTicketType}
          ticketTypeDetails={dashboard.details.ticketTypes}
          onOpenDetail={onOpenDetail}
        />
      </div>
    </div>
  );
};
