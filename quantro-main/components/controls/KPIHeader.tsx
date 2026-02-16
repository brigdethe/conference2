import React from 'react';
// import { TabOption } from '../../types';
import { KPIStat } from './KPIStat';
// import { HeaderNavigation } from '../header/HeaderNavigation';
// import { ControlsTabs } from './ControlsTabs';


// interface KPIHeaderProps {
//     activeTab: TabOption;
//     onTabChange: (tab: TabOption) => void;
// }

interface KPIHeaderProps {
    label: string;
    value: React.ReactNode;
    isLoading?: boolean;
}

export const KPIHeader: React.FC<KPIHeaderProps> = ({ label, value, isLoading = false }) => {
    return (
        <div className="flex flex-col gap-1 mb-8">
            <div className="flex flex-col-reverse md:flex-row md:justify-between items-start md:items-end gap-4 md:gap-0">
                <KPIStat label={label} value={value} isLoading={isLoading} />
                {/* <HeaderNavigation /> - Replaced by ControlsTabs */}
                {/* <ControlsTabs activeTab={activeTab} onTabChange={onTabChange} /> - Moved to Controls */}
            </div>
        </div>
    )
}
