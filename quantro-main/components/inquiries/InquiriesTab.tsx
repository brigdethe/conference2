import React, { useState, useEffect } from 'react';
import { Search, Filter, MessageSquare, Briefcase, Calendar, RefreshCw, Download, CheckCircle, XCircle, User, Building, Ticket, Clock } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import type { Inquiry, InquiryType } from '../../data/inquiries';

const INQUIRY_TYPES: InquiryType[] = [
    'General Inquiry',
    'Conference Registration',
    'Seminar Question',
    'Sponsorship',
    'Speaking Request',
    'Media / Press'
];

interface Question {
    id: number;
    ticket_code?: string;
    name: string;
    email?: string;
    question_text: string;
    session_number?: number;
    is_answered: boolean;
    created_at: string;
    answered_at?: string;
    registration_info?: {
        id: number;
        full_name: string;
        email: string;
        company?: string;
        firm_name?: string;
        status: string;
        ticket_type: string;
    };
}

interface InquiriesTabProps {
    onSelect: (inquiry: Inquiry) => void;
}

export const InquiriesTab: React.FC<InquiriesTabProps> = ({ onSelect }) => {
    const [selectedType, setSelectedType] = useState<InquiryType | 'All'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [showQuestionsOnly, setShowQuestionsOnly] = useState(false);
    const [filterSession, setFilterSession] = useState<number | null>(null);
    const [filterAnswered, setFilterAnswered] = useState<boolean | null>(null);

    const fetchInquiries = async () => {
        setLoading(true);
        try {
            const [inquiriesRes, questionsRes] = await Promise.all([
                fetch('/api/inquiries'),
                fetch('/api/questions')
            ]);
            
            // Fetch inquiries
            if (inquiriesRes.ok) {
                const data = await inquiriesRes.json();
                const mapped = data.map((item: any) => ({
                    id: String(item.id),
                    name: item.name,
                    email: item.email,
                    organization: item.organization || '',
                    type: item.inquiry_type as InquiryType,
                    message: item.message,
                    date: item.created_at
                }));
                setInquiries(mapped);
            }
            
            // Fetch questions
            if (questionsRes.ok) {
                const questionsData = await questionsRes.json();
                setQuestions(questionsData);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInquiries();
    }, []);

    const filteredInquiries = inquiries.filter(inquiry => {
        const matchesType = selectedType === 'All' || inquiry.type === selectedType;
        const matchesSearch =
            inquiry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inquiry.organization || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            inquiry.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    const filteredQuestions = questions.filter(q => {
        const matchesSearch = searchQuery === '' || 
            q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (q.ticket_code && q.ticket_code.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesSession = filterSession === null || q.session_number === filterSession;
        const matchesAnswered = filterAnswered === null || q.is_answered === filterAnswered;
        
        return matchesSearch && matchesSession && matchesAnswered;
    });

    const getSessionName = (sessionNum?: number) => {
        switch (sessionNum) {
            case 1: return 'Session II - Peter Alexiadis';
            case 2: return 'Session III - Prof. David Bailey';
            case 3: return 'Session IV - Panel Discussion';
            case 0: return 'General';
            default: return 'Not specified';
        }
    };

    const markAsAnswered = async (questionId: number) => {
        try {
            await fetch(`/api/questions/${questionId}/answer`, { method: 'PUT' });
            fetchInquiries();
        } catch (error) {
            console.error('Failed to mark question as answered:', error);
        }
    };

    const deleteQuestion = async (questionId: number) => {
        if (!confirm('Are you sure you want to delete this question?')) return;
        
        try {
            await fetch(`/api/questions/${questionId}`, { method: 'DELETE' });
            fetchInquiries();
        } catch (error) {
            console.error('Failed to delete question:', error);
        }
    };

    const exportToDocx = async () => {
        const children: Paragraph[] = [
            new Paragraph({
                text: showQuestionsOnly ? 'Seminar Questions Export' : 'Inquiries Export',
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 400 },
            }),
            new Paragraph({
                text: `Generated on ${new Date().toLocaleString()}`,
                spacing: { after: 400 },
            }),
        ];

        if (showQuestionsOnly) {
            // Export questions
            filteredQuestions.forEach((question, index) => {
                children.push(
                    new Paragraph({
                        text: `${index + 1}. ${question.name}`,
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 400, after: 200 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Email: ', bold: true }),
                            new TextRun(question.email || 'N/A'),
                        ],
                        spacing: { after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Session: ', bold: true }),
                            new TextRun(getSessionName(question.session_number)),
                        ],
                        spacing: { after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Status: ', bold: true }),
                            new TextRun(question.is_answered ? 'Answered' : 'Pending'),
                        ],
                        spacing: { after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Date: ', bold: true }),
                            new TextRun(new Date(question.created_at).toLocaleString()),
                        ],
                        spacing: { after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Question:', bold: true }),
                        ],
                        spacing: { after: 50 },
                    }),
                    new Paragraph({
                        text: question.question_text,
                        spacing: { after: 100 },
                    }),
                    ...(question.ticket_code ? [
                        new Paragraph({
                            children: [
                                new TextRun({ text: 'Ticket Code: ', bold: true }),
                                new TextRun(question.ticket_code),
                            ],
                            spacing: { after: 100 },
                        })
                    ] : []),
                    ...(question.registration_info ? [
                        new Paragraph({
                            children: [
                                new TextRun({ text: 'Registration Info:', bold: true }),
                            ],
                            spacing: { after: 50 },
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: 'Status: ', bold: true }),
                                new TextRun(question.registration_info.status),
                            ],
                            spacing: { after: 50 },
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: 'Ticket Type: ', bold: true }),
                                new TextRun(question.registration_info.ticket_type),
                            ],
                            spacing: { after: 50 },
                        }),
                        ...(question.registration_info.company ? [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Company: ', bold: true }),
                                    new TextRun(question.registration_info.company),
                                ],
                                spacing: { after: 50 },
                            })
                        ] : []),
                        ...(question.registration_info.firm_name ? [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Firm: ', bold: true }),
                                    new TextRun(question.registration_info.firm_name),
                                ],
                                spacing: { after: 300 },
                            })
                        ] : [])
                    ] : []),
                );
            });
        } else {
            // Export inquiries
            filteredInquiries.forEach((inquiry, index) => {
                children.push(
                    new Paragraph({
                        text: `${index + 1}. ${inquiry.name}`,
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 400, after: 200 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Email: ', bold: true }),
                            new TextRun(inquiry.email),
                        ],
                        spacing: { after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Organization: ', bold: true }),
                            new TextRun(inquiry.organization || 'N/A'),
                        ],
                        spacing: { after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Type: ', bold: true }),
                            new TextRun(inquiry.type),
                        ],
                        spacing: { after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Date: ', bold: true }),
                            new TextRun(new Date(inquiry.date).toLocaleString()),
                        ],
                        spacing: { after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Message:', bold: true }),
                        ],
                        spacing: { after: 50 },
                    }),
                    new Paragraph({
                        text: inquiry.message,
                        spacing: { after: 300 },
                    }),
                );
            });
        }

        const doc = new Document({
            sections: [{ children }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${showQuestionsOnly ? 'questions' : 'inquiries'}-${new Date().toISOString().split('T')[0]}.docx`);
    };

    return (
        <div className="bg-white rounded-3xl shadow-soft overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Filter Toolbar */}
            <div className="p-6 border-b border-gray-100 flex flex-col gap-4">
                {/* Toggle between Inquiries and Questions */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setShowQuestionsOnly(false)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${!showQuestionsOnly
                                ? 'bg-slate-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Inquiries ({inquiries.length})
                    </button>
                    <button
                        onClick={() => setShowQuestionsOnly(true)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${showQuestionsOnly
                                ? 'bg-slate-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Seminar Questions ({questions.length})
                    </button>
                    <button
                        onClick={fetchInquiries}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={exportToDocx}
                        disabled={(showQuestionsOnly ? filteredQuestions : filteredInquiries).length === 0}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        Export DOCX
                    </button>
                </div>

                {/* Filters */}
                {!showQuestionsOnly ? (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedType('All')}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selectedType === 'All'
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            All
                        </button>
                        {INQUIRY_TYPES.map(type => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${selectedType === type
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        <select
                            value={filterSession ?? ''}
                            onChange={(e) => setFilterSession(e.target.value ? parseInt(e.target.value) : null)}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors border-0"
                        >
                            <option value="">All Sessions</option>
                            <option value="0">General</option>
                            <option value="1">Session II</option>
                            <option value="2">Session III</option>
                            <option value="3">Session IV</option>
                        </select>
                        
                        <select
                            value={filterAnswered === null ? '' : filterAnswered.toString()}
                            onChange={(e) => setFilterAnswered(e.target.value ? e.target.value === 'true' : null)}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors border-0"
                        >
                            <option value="">All Status</option>
                            <option value="false">Unanswered</option>
                            <option value="true">Answered</option>
                        </select>
                    </div>
                )}

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                        type="text"
                        placeholder={showQuestionsOnly ? "Search questions..." : "Search inquiries..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-80"
                    />
                </div>
            </div>

            {/* List */}
            <div className="overflow-x-auto">
                {!showQuestionsOnly ? (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Organization</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[300px]">Message</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredInquiries.length > 0 ? (
                                filteredInquiries.map((inquiry) => (
                                    <tr
                                        key={inquiry.id}
                                        onClick={() => onSelect(inquiry)}
                                        className="hover:bg-gray-50 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900">{inquiry.name}</span>
                                                <span className="text-xs text-gray-500">{inquiry.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                                <Briefcase className="w-4 h-4 text-gray-400" />
                                                {inquiry.organization}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${inquiry.type === 'Seminar Question' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                    inquiry.type === 'Conference Registration' ? 'bg-green-50 text-green-700 border-green-100' :
                                                        inquiry.type === 'Sponsorship' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                            inquiry.type === 'Speaking Request' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                                inquiry.type === 'Media / Press' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                                    'bg-gray-50 text-gray-700 border-gray-200'
                                            }`}>
                                                {inquiry.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-2 max-w-md">
                                                <MessageSquare className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                                                <p className="text-sm text-gray-600 line-clamp-2" title={inquiry.message}>
                                                    {inquiry.message}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {new Date(inquiry.date).toLocaleDateString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                                        Loading inquiries...
                                    </td>
                                </tr>
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No inquiries found. Submit an inquiry on the website to see it here.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Question</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">From</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Session</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredQuestions.length > 0 ? (
                                filteredQuestions.map((question) => (
                                    <tr key={question.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="max-w-md">
                                                <p className="text-sm text-gray-900 font-medium">{question.question_text}</p>
                                                {question.ticket_code && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                                                        <Ticket className="h-3 w-3 mr-1" />
                                                        {question.ticket_code}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <div className="flex items-center text-gray-900">
                                                    <User className="h-4 w-4 mr-1" />
                                                    {question.name}
                                                </div>
                                                {question.registration_info ? (
                                                    <div className="mt-1 space-y-1">
                                                        {question.registration_info.company && (
                                                            <div className="flex items-center text-gray-600">
                                                                <Building className="h-3 w-3 mr-1" />
                                                                {question.registration_info.company}
                                                            </div>
                                                        )}
                                                        {question.registration_info.firm_name && (
                                                            <div className="text-xs text-blue-600">
                                                                {question.registration_info.firm_name}
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-gray-500">
                                                            Status: {question.registration_info.status} | {question.registration_info.ticket_type}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    question.email && (
                                                        <div className="text-gray-600 text-xs mt-1">{question.email}</div>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-900">
                                                {getSessionName(question.session_number)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {question.is_answered ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Answered
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                    <XCircle className="h-3 w-3 mr-1" />
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <Clock className="h-4 w-4 mr-1" />
                                                {new Date(question.created_at).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium">
                                            <div className="flex space-x-2">
                                                {!question.is_answered && (
                                                    <button
                                                        onClick={() => markAsAnswered(question.id)}
                                                        className="text-green-600 hover:text-green-900"
                                                        title="Mark as answered"
                                                    >
                                                        <CheckCircle className="h-5 w-5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => deleteQuestion(question.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Delete question"
                                                >
                                                    <XCircle className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                                        Loading questions...
                                    </td>
                                </tr>
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-500">No questions found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
                <span>Showing {showQuestionsOnly ? filteredQuestions.length : filteredInquiries.length} results</span>
            </div>
        </div>
    );
};
