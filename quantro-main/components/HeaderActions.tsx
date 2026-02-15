import React from 'react';
import { HeaderSearch } from './HeaderSearch';
import { HeaderNotifications } from './HeaderNotifications';
import { HeaderProfile } from './HeaderProfile';

export const HeaderActions: React.FC = () => {
    return (
        <div className="flex items-center gap-4">
            <HeaderSearch />
            <HeaderNotifications />
            <HeaderProfile />
        </div>
    );
};