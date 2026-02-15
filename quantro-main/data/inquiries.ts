export type InquiryType =
    | 'General Inquiry'
    | 'Conference Registration'
    | 'Seminar Question'
    | 'Sponsorship'
    | 'Speaking Request'
    | 'Media / Press';

export interface Inquiry {
    id: string;
    name: string;
    email: string;
    organization: string;
    type: InquiryType;
    message: string;
    date: string; // ISO date string
}

export const INQUIRIES: Inquiry[] = [
    {
        id: '1',
        name: 'Sarah Mensah',
        email: 's.mensah@bentsienchill.com',
        organization: 'Bentsi Enchill Letsa and Ankomah',
        type: 'Conference Registration',
        message: 'We would like to register 5 partners for the upcoming seminar. Is there a group discount available?',
        date: '2026-02-14T09:30:00Z'
    },
    {
        id: '2',
        name: 'David Osei',
        email: 'd.osei@ab-david.com',
        organization: 'AB and David Law Firm Ghana',
        type: 'Seminar Question',
        message: 'Will the discussion on the new Competition Bill cover the implications for telecommunications mergers?',
        date: '2026-02-13T14:15:00Z'
    },
    {
        id: '3',
        name: 'Kofi Annan',
        email: 'k.annan@media-gh.com',
        organization: 'Ghana Broadcasting Corporation',
        type: 'Media / Press',
        message: 'Requesting press accreditation for the seminar event.',
        date: '2026-02-12T11:00:00Z'
    },
    {
        id: '4',
        name: 'Akua Boateng',
        email: 'a.boateng@mtn.com.gh',
        organization: 'MTN Ghana',
        type: 'Sponsorship',
        message: 'We are interested in sponsoring the networking lunch. Please send us the sponsorship packages.',
        date: '2026-02-10T16:45:00Z'
    },
    {
        id: '5',
        name: 'James Oppong',
        email: 'j.oppong@uni-ghana.edu.gh',
        organization: 'University of Ghana',
        type: 'Speaking Request',
        message: 'Professor Oppong would be interested in participating in the panel discussion regarding antitrust regulations.',
        date: '2026-02-08T08:20:00Z'
    },
    {
        id: '6',
        name: 'General Info',
        email: 'info@legalstone.com',
        organization: 'Legalstone Solicitors',
        type: 'General Inquiry',
        message: 'Is there a virtual attendance option for international participants?',
        date: '2026-02-05T13:10:00Z'
    },
    {
        id: '7',
        name: 'Ama Serwaa',
        email: 'ama.serwaa@ensafrica.com',
        organization: 'ENS Ghana',
        type: 'Conference Registration',
        message: 'Clarification on VIP ticket benefits.',
        date: '2026-02-04T10:00:00Z'
    }
];
