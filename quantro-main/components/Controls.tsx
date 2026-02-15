import React from 'react';
import { TabOption } from '../types';
import { ControlsTitle } from './controls/ControlsTitle';
import { ControlsTabs } from './controls/ControlsTabs';

import { KPIHeader as KPIHeaderInternal } from './controls/KPIHeader';

interface ControlsProps {
  activeTab: TabOption;
  onTabChange: (tab: TabOption) => void;
}

export const Controls: React.FC<ControlsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex flex-col gap-6 mb-8">
      {/* Top Row: Title & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <ControlsTitle activeTab={activeTab} />
        <ControlsTabs activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </div>
  );
};


export const KPIHeader = KPIHeaderInternal;