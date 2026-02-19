import React from 'react';
import { HeaderSearch } from './HeaderSearch';
import { HeaderNotifications } from './HeaderNotifications';
import { HeaderProfile } from './HeaderProfile';

interface HeaderActionsProps {
    onLogout?: () => void;
}

export const HeaderActions: React.FC<HeaderActionsProps> = ({ onLogout }) => {
    return (
        <div className="flex items-center gap-4">
            {/* <HeaderSearch /> */}
            <HeaderNotifications />
            <HeaderProfile onLogout={onLogout} />
        </div>
    );
};