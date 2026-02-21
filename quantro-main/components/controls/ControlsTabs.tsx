import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { TabOption } from '../../types';
import { useTabBadges, type TabBadges } from '../../hooks/useTabBadges';

interface ControlsTabsProps {
    activeTab: TabOption;
    onTabChange: (tab: TabOption) => void;
}

function getTabBadgeCount(tab: TabOption, badges: TabBadges): number {
    if (tab === TabOption.Approvals) return badges[TabOption.Approvals];
    if (tab === TabOption.Payments) return badges[TabOption.Payments];
    if (tab === TabOption.Inquiries) return badges[TabOption.Inquiries];
    return 0;
}

export const ControlsTabs: React.FC<ControlsTabsProps> = ({ activeTab, onTabChange }) => {
    const { refetch, ...badges } = useTabBadges();
    useEffect(() => {
        if (activeTab === TabOption.Approvals || activeTab === TabOption.Payments || activeTab === TabOption.Inquiries) {
            refetch();
        }
    }, [activeTab, refetch]);
    return (
        <div className="inline-flex bg-white p-1 rounded-xl shadow-sm">
            {Object.values(TabOption).map((tab) => {
                const count = getTabBadgeCount(tab, badges);
                return (
                    <button key={tab} onClick={() => onTabChange(tab)} className="relative px-5 py-1.5 text-sm font-medium rounded-lg transition-colors z-10">
                        {activeTab === tab && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-black rounded-lg"
                                initial={false}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                        <span className={`relative z-20 inline-flex items-center gap-1.5 ${activeTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                            {tab}
                            {count > 0 && (
                                <span
                                    className={`min-w-[1.25rem] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[11px] font-bold ${
                                        activeTab === tab
                                            ? 'bg-white/25 text-white'
                                            : 'bg-red-500 text-white'
                                    }`}
                                >
                                    {count > 99 ? '99+' : count}
                                </span>
                            )}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};
