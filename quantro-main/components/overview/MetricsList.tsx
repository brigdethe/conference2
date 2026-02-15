import React from 'react';
import { Users, Ticket, CreditCard, TrendingUp, UserCheck, UserX } from 'lucide-react';
import type { DashboardMetrics } from '../../data/dashboard';

interface MetricsListProps {
    dashboard: DashboardMetrics;
}

export const MetricsList: React.FC<MetricsListProps> = ({ dashboard }) => {
    const metrics = [
        {
            label: 'Total Registrations',
            value: dashboard.registeredUsers.toLocaleString(),
            icon: Users,
            color: 'text-slate-800',
            bg: 'bg-slate-100'
        },
        {
            label: 'VIP Tickets Sold',
            value: dashboard.vipSales.toLocaleString(),
            subValue: `GHS ${(dashboard.revenueByTicketType.VIP.amount).toLocaleString()}`,
            icon: Ticket,
            color: 'text-slate-800',
            bg: 'bg-slate-100'
        },
        {
            label: 'Regular Tickets Sold',
            value: dashboard.regularSales.toLocaleString(),
            subValue: `GHS ${(dashboard.revenueByTicketType.Regular.amount).toLocaleString()}`,
            icon: Ticket,
            color: 'text-slate-800',
            bg: 'bg-slate-100'
        },
        {
            label: 'Total Revenue',
            value: `GHS ${dashboard.totalRevenue.toLocaleString()}`,
            icon: CreditCard,
            color: 'text-slate-800',
            bg: 'bg-slate-100'
        },
        {
            label: 'Invited Guests',
            value: dashboard.invitedGuests.toLocaleString(),
            icon: UserCheck,
            color: 'text-slate-800',
            bg: 'bg-slate-100'
        }
    ];

    return (
        <div className="bg-white rounded-3xl p-6 shadow-soft h-[500px] flex flex-col overflow-hidden">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-6">Quick Stats</h2>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {metrics.map((metric, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group">
                        <div className={`p-3 rounded-2xl ${metric.bg} ${metric.color} group-hover:scale-110 transition-transform`}>
                            <metric.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-500 truncate">{metric.label}</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-bold text-gray-900">{metric.value}</span>
                                {metric.subValue && (
                                    <span className="text-xs text-gray-400 font-medium">{metric.subValue}</span>
                                )}
                            </div>
                        </div>
                    </div>
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
