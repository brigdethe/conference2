import React from 'react';
import { Bell } from 'lucide-react';

export const HeaderNotifications: React.FC = () => {
    return (
        <button className="p-2 bg-white rounded-lg shadow-sm text-gray-600 hover:text-gray-900 transition-colors">
            <Bell className="w-4 h-4" />
        </button>
    );
};