import React from 'react';

export const ControlsTitle: React.FC = () => {
    return (
        <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-medium text-textPrimary">Overview</h1>
            <div className="flex items-center gap-2 text-xs text-textTertiary">
                <span className="w-2 h-2 bg-gray-300 rounded-sm"></span>
                <span>Kreoslab hub</span>
                <span className="text-gray-300">/</span>
                <span className="w-2 h-2 bg-gray-400 rounded-full opacity-50"></span>
                <span className="font-medium text-gray-500">Traffic</span>
            </div>
        </div>
    );
};