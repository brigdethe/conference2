import React from 'react';
import { TabOption } from '../../types';

interface ControlsTitleProps {
    activeTab: TabOption;
}

export const ControlsTitle: React.FC<ControlsTitleProps> = ({ activeTab }) => {
    return (
        <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-medium text-textPrimary">{activeTab}</h1>
            <div className="flex items-center gap-2 text-xs text-textTertiary">
                <span className="w-2 h-2 bg-gray-300 rounded-sm"></span>
                <span>Competition Law Seminar</span>
                <span className="text-gray-300">/</span>
                <span className="w-2 h-2 bg-gray-400 rounded-full opacity-50"></span>
                <span className="font-medium text-gray-500">{activeTab}</span>
            </div>
        </div>
    );
};