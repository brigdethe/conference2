import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';

type ChartView = 'guest-type' | 'invited-status' | 'registration-trend';

export const GuestTypeChart: React.FC = () => {
    const [view, setView] = useState<ChartView>('guest-type');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

    const getChartData = () => {
        switch (view) {
            case 'guest-type':
                return {
                    title: 'Guest Distribution',
                    data: [
                        { label: 'Paid', value: 450, color: 'bg-slate-900' },
                        { label: 'Invited', value: 52, color: 'bg-slate-300' },
                    ],
                    type: 'bar',
                    total: 502
                };
            case 'invited-status':
                return {
                    title: 'Invited Guest Status',
                    data: [
                        { label: 'Accepted', value: 42, color: 'bg-slate-900' },
                        { label: 'Declined', value: 10, color: 'bg-slate-300' },
                    ],
                    type: 'bar',
                    total: 52
                };
            case 'registration-trend':
                return {
                    title: 'Registration Trend (10 Days)',
                    data: Array.from({ length: 10 }).map((_, i) => ({
                        label: `Day ${i + 1}`,
                        value: Math.floor(Math.random() * 50) + 10,
                        color: i === 9 ? 'bg-slate-900' : 'bg-slate-200'
                    })),
                    type: 'trend',
                    total: 0
                };
        }
    };

    const chartConfig = getChartData();
    const maxValue = Math.max(...chartConfig.data.map(d => d.value)) * 1.2;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-full flex flex-col relative">

            {/* Header with Menu */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-slate-800">{chartConfig.title}</h3>
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20"
                            >
                                <button onClick={() => { setView('guest-type'); setIsMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${view === 'guest-type' ? 'font-medium text-slate-900 bg-slate-50' : 'text-slate-600'}`}>Guest Distribution</button>
                                <button onClick={() => { setView('invited-status'); setIsMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${view === 'invited-status' ? 'font-medium text-slate-900 bg-slate-50' : 'text-slate-600'}`}>Invited Status</button>
                                <button onClick={() => { setView('registration-trend'); setIsMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${view === 'registration-trend' ? 'font-medium text-slate-900 bg-slate-50' : 'text-slate-600'}`}>Registration Trend</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-grow flex items-end justify-around pb-4 gap-2 sm:gap-4 md:gap-8">
                <AnimatePresence mode="wait">
                    {chartConfig.data.map((item, index) => (
                        <motion.div
                            key={`${view}-${index}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="flex flex-col items-center gap-2 group flex-1"
                        >
                            <div className="relative w-full h-[250px] flex items-end justify-center bg-slate-50/50 rounded-t-lg overflow-hidden">
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${(item.value / maxValue) * 100}%` }}
                                    transition={{ duration: 0.6, type: "spring", bounce: 0 }}
                                    className={`w-full max-w-[40px] ${view === 'registration-trend' ? 'rounded-sm' : 'rounded-t-md'} ${item.color} relative min-h-[4px]`}
                                >
                                    {/* Tooltip for trend or value label for others */}
                                    {view !== 'registration-trend' && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                            className="absolute -top-6 left-1/2 -translate-x-1/2 font-bold text-slate-700 text-sm"
                                        >
                                            {item.value}
                                        </motion.div>
                                    )}
                                </motion.div>
                            </div>
                            {/* X-Axis Label */}
                            <span className="text-[10px] sm:text-xs font-medium text-slate-500 truncate max-w-full text-center">
                                {view === 'registration-trend' ? item.label.replace('Day ', '') : item.label}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Legend / Summary */}
            {view !== 'registration-trend' && (
                <div className="border-t border-slate-100 pt-4 flex justify-center gap-4 sm:gap-8 flex-wrap">
                    {chartConfig.data.map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${item.color.replace('bg-', 'bg-')}`}></div>
                            <span className="text-sm text-slate-600">{item.label} ({Math.round((item.value / chartConfig.total) * 100)}%)</span>
                        </div>
                    ))}
                </div>
            )}
            {view === 'registration-trend' && (
                <div className="border-t border-slate-100 pt-4 text-center">
                    <span className="text-sm text-slate-500">Last 10 days activity</span>
                </div>
            )}
        </div>
    );
};
