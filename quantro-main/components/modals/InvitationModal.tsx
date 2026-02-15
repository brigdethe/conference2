import React, { useState } from 'react';
import { X, Send, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InvitationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LAW_FIRMS = [
    "Bentsi Enchill Letsa and Ankomah",
    "AB and David Law Firm Ghana",
    "N. Dowuona and Company",
    "WTS Nobisfields",
    "Kulendi at Law",
    "Africa Legal Associates",
    "ENS Ghana",
    "Minkah Premo Osei Bonsu Bruce Cathline and Partners",
    "B and P Associates Lawyers Consultants and Notaries Public",
    "Axis Legal",
    "Zoe Akyea and Company",
    "Griffin Legal",
    "Ntrakwah and Company",
    "Beyuo and Company",
    "Legal Ink Lawyers and Notaries",
    "Legalstone Solicitors",
    "Legal Ink Lawyers",
    "Clyde and Company Kumasi",
    "Koffie and Partners Law",
    "Conclave Lawyers",
    "Amoah and Associates Law Firm"
];

export const InvitationModal: React.FC<InvitationModalProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        lawFirm: '',
        recipientName: '',
        email: '',
        subject: 'Invitation to Ghana Competition Law Seminar',
        message: `Dear [Name],\n\nWe are pleased to invite you to the upcoming Ghana Competition Law Seminar.\n\nDate: March 25, 2026\nLocation: Mövenpick Ambassador Hotel, Accra\n\nWe look forward to your participation.\n\nBest regards,\nThe CMC Team`
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate sending
        console.log('Sending invitation:', formData);
        alert(`Invitation sent to ${formData.email} at ${formData.lawFirm}`);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
                    >
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl pointer-events-auto flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between p-6 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-900">Send Invitation</h2>
                                        <p className="text-sm text-slate-500">Invite a law firm to the seminar</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Law Firm</label>
                                        <select
                                            required
                                            value={formData.lawFirm}
                                            onChange={e => setFormData({ ...formData, lawFirm: e.target.value })}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none text-slate-900 transition-all text-sm"
                                        >
                                            <option value="" disabled>Select a law firm...</option>
                                            {LAW_FIRMS.map(firm => (
                                                <option key={firm} value={firm}>{firm}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.recipientName}
                                                onChange={e => setFormData({ ...formData, recipientName: e.target.value })}
                                                placeholder="e.g. John Doe"
                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none text-slate-900 transition-all text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="john@example.com"
                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none text-slate-900 transition-all text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.subject}
                                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none text-slate-900 transition-all text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                                        <textarea
                                            required
                                            rows={6}
                                            value={formData.message}
                                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none text-slate-900 transition-all text-sm resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 shadow-sm shadow-slate-200"
                                    >
                                        <Send className="w-4 h-4" />
                                        Send Invitation
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
