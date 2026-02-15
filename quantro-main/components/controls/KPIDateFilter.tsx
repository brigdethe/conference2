import React from 'react';
import { Calendar, RefreshCw, ChevronDown } from 'lucide-react';

export const KPIDateFilter: React.FC = () => {
    return (
        <div className="flex gap-2 mb-2">
            <button className="p-2 bg-white rounded-lg text-gray-400 hover:text-gray-600 shadow-sm transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 shadow-sm transition-colors group">
                <Calendar className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                <span>Nov 1' 24 - Dec 1' 24</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
        </div>
    );
};