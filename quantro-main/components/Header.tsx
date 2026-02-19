import React from 'react';
import { HeaderLogo } from './header/HeaderLogo';
import { HeaderActions } from './header/HeaderActions';

interface HeaderProps {
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  return (
    <header className="flex flex-row items-center justify-between w-full py-4 px-6">
      <HeaderLogo />
      <HeaderActions onLogout={onLogout} />
    </header>
  );
};