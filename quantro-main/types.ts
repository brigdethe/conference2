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
  Overview = 'Overview',
  Firms = 'Firms',
  Attendees = 'Attendees',
  Tickets = 'Tickets',
  Approvals = 'Approvals',
  Payments = 'Payments',
  Inquiries = 'Inquiries',
  Revenue = 'Revenue',
  Settings = 'Settings'
}