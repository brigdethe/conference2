import React from 'react';

export interface NavItem {
  icon: React.ReactNode;
  active?: boolean;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  highlight?: boolean;
}

export enum TabOption {
  Dashboard = 'Dashboard',
  Firms = 'Firms',
  Attendees = 'Attendees',
  Registrations = 'Registrations',
  Duplicates = 'Duplicates',
  CheckIn = 'Check-in',
  Inquiries = 'Inquiries',
  Settings = 'Settings'
}