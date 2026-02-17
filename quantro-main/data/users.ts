export interface User {
  id: number;
  fullName: string;
  jobTitle: string;
  lawFirm: string;
  company?: string;
  organization?: string;
  email: string;
  phone: string;
  attendanceType: 'In-Person' | 'Virtual';
  ticketType?: 'Access Code' | 'Paid';
  registeredAt?: string;
}

export const mockUsers: User[] = [
  {
    id: 1,
    fullName: 'Sarah Johnson',
    jobTitle: 'Senior Partner',
    lawFirm: 'Johnson & Associates',
    email: 'sarah.j@example.com',
    phone: '+1 (555) 123-4567',
    attendanceType: 'In-Person',
    ticketType: 'Access Code',
    registeredAt: '2026-02-08T10:15:00.000Z',
  },
  {
    id: 2,
    fullName: 'Michael Chen',
    jobTitle: 'Associate Attorney',
    lawFirm: 'Chen Legal Group',
    email: 'm.chen@example.com',
    phone: '+1 (555) 987-6543',
    attendanceType: 'Virtual',
    ticketType: 'Regular',
    registeredAt: '2026-02-09T13:40:00.000Z',
  },
  {
    id: 3,
    fullName: 'Emily Davis',
    jobTitle: 'Legal Consultant',
    lawFirm: 'Davis Consulting',
    email: 'emily.d@example.com',
    phone: '+1 (555) 456-7890',
    attendanceType: 'In-Person',
    ticketType: 'VIP',
    registeredAt: '2026-02-10T09:20:00.000Z',
  },
  {
    id: 4,
    fullName: 'David Wilson',
    jobTitle: 'Managing Director',
    lawFirm: 'Wilson Partners',
    email: 'david.w@example.com',
    phone: '+1 (555) 789-0123',
    attendanceType: 'In-Person',
    ticketType: 'VIP',
    registeredAt: '2026-02-11T15:05:00.000Z',
  },
  {
    id: 5,
    fullName: 'Jessica Brown',
    jobTitle: 'Corporate Counsel',
    lawFirm: 'Global Corp Legal',
    email: 'j.brown@example.com',
    phone: '+1 (555) 321-6547',
    attendanceType: 'Virtual',
    ticketType: 'Regular',
    registeredAt: '2026-02-12T11:30:00.000Z',
  },
  {
    id: 6,
    fullName: 'Robert Taylor',
    jobTitle: 'Paralegal',
    lawFirm: 'Taylor & Sons',
    email: 'robert.t@example.com',
    phone: '+1 (555) 654-3210',
    attendanceType: 'In-Person',
    ticketType: 'VIP',
    registeredAt: '2026-02-13T16:45:00.000Z',
  },
];
