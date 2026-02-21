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
      <div className="w-full">
        <ControlsTitle activeTab={activeTab} />
      </div>
      <div className="w-full">
        <ControlsTabs activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </div>
  );
};


export const KPIHeader = KPIHeaderInternal;