import React from 'react';
import { motion } from 'framer-motion';
import { TabOption } from '../../types';

interface ControlsTabsProps {
    activeTab: TabOption;
    onTabChange: (tab: TabOption) => void;
}

export const ControlsTabs: React.FC<ControlsTabsProps> = ({ activeTab, onTabChange }) => {
    return (
        <div className="inline-flex bg-white p-1 rounded-xl shadow-sm">
            {Object.values(TabOption).map((tab) => (
                <button key={tab} onClick={() => onTabChange(tab)} className="relative px-5 py-1.5 text-sm font-medium rounded-lg transition-colors z-10">
                    {activeTab === tab && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-black rounded-lg"
                            initial={false}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    )}
                    <span className={`relative z-20 ${activeTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                        {tab}
                    </span>
                </button>
            ))}
        </div>
    );
};
