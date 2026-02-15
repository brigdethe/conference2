import React from 'react';
// import { TabOption } from '../types';
import { HeaderLogo } from './header/HeaderLogo';
// import { HeaderNavigation } from './header/HeaderNavigation';
// import { ControlsTabs } from './controls/ControlsTabs';
import { HeaderActions } from './header/HeaderActions';

// interface HeaderProps {
//   activeTab: TabOption;
//   onTabChange: (tab: TabOption) => void;
// }

export const Header: React.FC = () => {
  return (
    <header className="flex flex-row items-center justify-between w-full py-4 px-6">

      <HeaderLogo />
      {/* <ControlsTabs activeTab={activeTab} onTabChange={onTabChange} /> - Moved to KPIHeader */}
      <HeaderActions />
    </header>
  );
};