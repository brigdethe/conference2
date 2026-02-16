import React from 'react';
import type { DashboardMetrics, DashboardSidebarContent } from '../../data/dashboard';

interface MetricsListProps {
    dashboard: DashboardMetrics;
    onOpenDetail?: (detail: DashboardSidebarContent) => void;
}

export const MetricsList: React.FC<MetricsListProps> = ({ dashboard, onOpenDetail }) => {
    const metrics = [
        {
            label: 'Total Registrations',
            value: dashboard.registeredUsers.toLocaleString(),
            detail: {
                kind: 'overviewRegistrations',
                registrations: dashboard.details.overview.registrations
            } as DashboardSidebarContent
        },
        {
            label: 'Access Code Users',
            value: dashboard.accessCodeSales.toLocaleString(),
            subValue: `GHS ${(dashboard.revenueByTicketType.AccessCode.amount).toLocaleString()}`,
            detail: {
                kind: 'ticketType',
                ticketType: dashboard.details.ticketTypes.AccessCode
            } as DashboardSidebarContent
        },
        {
            label: 'Paid Guests',
            value: dashboard.paidSales.toLocaleString(),
            subValue: `GHS ${(dashboard.revenueByTicketType.Paid.amount).toLocaleString()}`,
            detail: {
                kind: 'ticketType',
                ticketType: dashboard.details.ticketTypes.Paid
            } as DashboardSidebarContent
        },
        {
            label: 'Total Revenue',
            value: `GHS ${dashboard.totalRevenue.toLocaleString()}`,
            detail: {
                kind: 'revenueTotal',
                revenueByTicketType: dashboard.revenueByTicketType
            } as DashboardSidebarContent
        },
        {
            label: 'Invited Guests',
            value: dashboard.invitedGuests.toLocaleString(),
            detail: {
                kind: 'overviewInvitedGuests',
                invitedGuests: dashboard.details.overview.invitedGuests
            } as DashboardSidebarContent
        }
    ];

    return (
        <div className="bg-white rounded-3xl p-6 shadow-soft h-[500px] flex flex-col overflow-hidden">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-6">Quick Stats</h2>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {metrics.map((metric, index) => (
                    <button
                        key={index}
                        type="button"
                        onClick={() => onOpenDetail?.(metric.detail)}
                        className="w-full text-left p-4 rounded-2xl transition-colors border border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                    >
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-500 truncate">{metric.label}</p>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-lg font-semibold text-gray-900">{metric.value}</span>
                                {metric.subValue && (
                                    <span className="text-xs text-gray-500">{metric.subValue}</span>
                                )}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #CBD5E1;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94A3B8;
                }
            `}</style>
        </div>
    );
};
