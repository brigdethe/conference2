import React, { useState, useEffect } from 'react';
import { Search, Filter, MessageSquare, Briefcase, Calendar, RefreshCw, Download } from 'lucide-react';
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

interface InquiriesTabProps {
    onSelect: (inquiry: Inquiry) => void;
}

export const InquiriesTab: React.FC<InquiriesTabProps> = ({ onSelect }) => {
    const [selectedType, setSelectedType] = useState<InquiryType | 'All'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchInquiries = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/inquiries');
            if (res.ok) {
                const data = await res.json();
                // Map backend response to frontend format
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
        } catch (err) {
            console.error('Error fetching inquiries:', err);
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

    const exportToDocx = async () => {
        const children: Paragraph[] = [
            new Paragraph({
                text: 'Inquiries Export',
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 400 },
            }),
            new Paragraph({
                text: `Generated on ${new Date().toLocaleString()}`,
                spacing: { after: 400 },
            }),
        ];

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

        const doc = new Document({
            sections: [{ children }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `inquiries-${new Date().toISOString().split('T')[0]}.docx`);
    };

    return (
        <div className="bg-white rounded-3xl shadow-soft overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Filter Toolbar */}
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
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
                        disabled={filteredInquiries.length === 0}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        Export DOCX
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="overflow-x-auto">
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
            </div>

            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
                <span>Showing {filteredInquiries.length} results</span>
            </div>
        </div>
    );
};
