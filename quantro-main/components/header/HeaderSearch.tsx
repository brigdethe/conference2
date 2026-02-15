import React from 'react';
import { Search } from 'lucide-react';

export const HeaderSearch: React.FC = () => {
    return (
        <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-gray-600" />
            <input
                type="text"
                placeholder="Search Dashboard"
                className="pl-9 pr-4 py-2 bg-white rounded-lg text-sm text-gray-700 w-64 shadow-sm border border-transparent focus:border-gray-200 focus:outline-none transition-all placeholder:text-gray-300"
            />
        </div>
    );
};