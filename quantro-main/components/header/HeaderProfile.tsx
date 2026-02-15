import React from 'react';
import { ChevronDown } from 'lucide-react';

export const HeaderProfile: React.FC = () => {
    return (
        <div className="flex items-center gap-3 pl-2 border-l border-gray-200/50">
            <div className="relative">
                <img src="https://picsum.photos/64/64" alt="User" className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="hidden sm:flex flex-col text-xs">
                <span className="font-semibold text-gray-900">Tuki Joshua</span>
                <span className="text-gray-400">Manager</span>
            </div>
            <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
        </div>
    );
};