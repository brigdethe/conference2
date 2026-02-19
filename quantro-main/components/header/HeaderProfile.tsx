import React, { useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';

interface HeaderProfileProps {
    onLogout?: () => void;
}

export const HeaderProfile: React.FC<HeaderProfileProps> = ({ onLogout }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="flex items-center gap-3 pl-2 border-l border-gray-200/50 relative">
            <div className="relative">
                <img src="https://ui-avatars.com/api/?name=CMC+Manager&background=0D9488&color=fff" alt="User" className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="hidden sm:flex flex-col text-xs">
                <span className="font-semibold text-gray-900">CMC Manager</span>
                <span className="text-gray-400">Admin</span>
            </div>
            <button 
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                onClick={() => setShowMenu(!showMenu)}
            >
                <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            
            {showMenu && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                    <button
                        onClick={() => {
                            setShowMenu(false);
                            onLogout?.();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            )}
        </div>
    );
};