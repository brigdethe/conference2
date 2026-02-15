export interface User {
  id: number;
  fullName: string;
  jobTitle: string;
  lawFirm: string;
  email: string;
  phone: string;
  attendanceType: 'In-Person' | 'Virtual';
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
  },
  {
    id: 2,
    fullName: 'Michael Chen',
    jobTitle: 'Associate Attorney',
    lawFirm: 'Chen Legal Group',
    email: 'm.chen@example.com',
    phone: '+1 (555) 987-6543',
    attendanceType: 'Virtual',
  },
  {
    id: 3,
    fullName: 'Emily Davis',
    jobTitle: 'Legal Consultant',
    lawFirm: 'Davis Consulting',
    email: 'emily.d@example.com',
    phone: '+1 (555) 456-7890',
    attendanceType: 'In-Person',
  },
  {
    id: 4,
    fullName: 'David Wilson',
    jobTitle: 'Managing Director',
    lawFirm: 'Wilson Partners',
    email: 'david.w@example.com',
    phone: '+1 (555) 789-0123',
    attendanceType: 'In-Person',
  },
  {
    id: 5,
    fullName: 'Jessica Brown',
    jobTitle: 'Corporate Counsel',
    lawFirm: 'Global Corp Legal',
    email: 'j.brown@example.com',
    phone: '+1 (555) 321-6547',
    attendanceType: 'Virtual',
  },
  {
    id: 6,
    fullName: 'Robert Taylor',
    jobTitle: 'Paralegal',
    lawFirm: 'Taylor & Sons',
    email: 'robert.t@example.com',
    phone: '+1 (555) 654-3210',
    attendanceType: 'In-Person',
  },
];
