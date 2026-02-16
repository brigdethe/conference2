import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import type { DashboardMetrics } from '../../data/dashboard';

type ChartView = 'guest-type' | 'invited-status' | 'registration-trend';

interface GuestTypeChartProps {
    dashboard: DashboardMetrics;
}

export const GuestTypeChart: React.FC<GuestTypeChartProps> = ({ dashboard }) => {
    const [view, setView] = useState<ChartView>('guest-type');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    const getChartData = () => {
        switch (view) {
            case 'guest-type':
                return {
                    title: 'Guest Distribution',
                    data: [
                        { label: 'Access Code', value: dashboard.revenueByTicketType.AccessCode.count, color: 'bg-slate-900' },
                        { label: 'Paid', value: dashboard.revenueByTicketType.Paid.count, color: 'bg-slate-300' },
                    ],
                    type: 'bar',
                    total: dashboard.revenueByTicketType.total.count,
                };
            case 'invited-status':
                return {
                    title: 'Invited Guest Status',
                    data: [
                        { label: 'Accepted', value: dashboard.invitedAccepted, color: 'bg-slate-900' },
                        { label: 'Declined', value: dashboard.invitedDeclined, color: 'bg-slate-300' },
                    ],
                    type: 'bar',
                    total: dashboard.invitedAccepted + dashboard.invitedDeclined,
                };
            case 'registration-trend': {
                const days = dashboard.registrationTrend.map((value, index) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (dashboard.registrationTrend.length - 1 - index));
                    return {
                        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        value,
                        isToday: index === dashboard.registrationTrend.length - 1,
                    };
                });

                return {
                    title: 'Registration Trend (7 Days)',
                    data: days.map((day) => ({
                        label: day.label,
                        value: day.value,
                        color: day.isToday ? 'bg-slate-900' : 'bg-slate-200',
                    })),
                    type: 'trend',
                    total: days.reduce((sum, day) => sum + day.value, 0),
                };
            }
            default:
                return {
                    title: 'Guest Distribution',
                    data: [],
                    type: 'bar',
                    total: 0,
                };
        }
    };

    const chartConfig = getChartData();
    const maxValue = Math.max(1, ...chartConfig.data.map((point) => point.value)) * 1.2;

    return (
        <div className="relative flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-800">{chartConfig.title}</h3>
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                        <MoreHorizontal className="h-5 w-5" />
                    </button>
                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                            >
                                <button
                                    onClick={() => {
                                        setView('guest-type');
                                        setIsMenuOpen(false);
                                    }}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${view === 'guest-type' ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-600'}`}
                                >
                                    Guest Distribution
                                </button>
                                <button
                                    onClick={() => {
                                        setView('invited-status');
                                        setIsMenuOpen(false);
                                    }}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${view === 'invited-status' ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-600'}`}
                                >
                                    Invited Status
                                </button>
                                <button
                                    onClick={() => {
                                        setView('registration-trend');
                                        setIsMenuOpen(false);
                                    }}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${view === 'registration-trend' ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-600'}`}
                                >
                                    Registration Trend
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="flex flex-grow items-end justify-around gap-2 pb-4 sm:gap-4 md:gap-8">
                <AnimatePresence mode="wait">
                    {chartConfig.data.map((item, index) => (
                        <motion.div
                            key={`${view}-${index}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="group flex flex-1 flex-col items-center gap-2"
                        >
                            <div className="relative flex h-[250px] w-full items-end justify-center overflow-hidden rounded-t-lg bg-slate-50/50">
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${(item.value / maxValue) * 100}%` }}
                                    transition={{ duration: 0.6, type: 'spring', bounce: 0 }}
                                    className={`relative min-h-[4px] w-full max-w-[40px] ${view === 'registration-trend' ? 'rounded-sm' : 'rounded-t-md'} ${item.color}`}
                                >
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-bold text-slate-700"
                                    >
                                        {item.value}
                                    </motion.div>
                                </motion.div>
                            </div>
                            <span className="max-w-full truncate text-center text-[10px] font-medium text-slate-500 sm:text-xs">
                                {item.label}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {view !== 'registration-trend' && (
                <div className="flex flex-wrap justify-center gap-4 border-t border-slate-100 pt-4 sm:gap-8">
                    {chartConfig.data.map((item) => {
                        const share = chartConfig.total > 0 ? Math.round((item.value / chartConfig.total) * 100) : 0;
                        return (
                            <div key={item.label} className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full ${item.color}`}></div>
                                <span className="text-sm text-slate-600">
                                    {item.label} ({share}%)
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
            {view === 'registration-trend' && (
                <div className="border-t border-slate-100 pt-4 text-center">
                    <span className="text-sm text-slate-500">{chartConfig.total} registrations in last 7 days</span>
                </div>
            )}
        </div>
    );
};
