import React from 'react';

interface KPIStatProps {
    label: string;
    value: React.ReactNode;
    isLoading?: boolean;
}

export const KPIStat: React.FC<KPIStatProps> = ({ label, value, isLoading = false }) => {
    return (
        <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</h3>
            <div className="text-6xl sm:text-7xl font-semibold tracking-tight text-gray-800 leading-none">
                {isLoading ? '...' : value}
            </div>
        </div>
    );
};
