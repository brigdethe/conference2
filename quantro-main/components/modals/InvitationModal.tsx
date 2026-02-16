import React, { useState, useEffect } from 'react';
import { X, Send, Mail, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InvitationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface LawFirm {
    name: string;
    code?: string;
}

export const InvitationModal: React.FC<InvitationModalProps> = ({ isOpen, onClose }) => {
    const [firms, setFirms] = useState<LawFirm[]>([]);
    const [isCustomFirm, setIsCustomFirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        lawFirm: '',
        recipientName: '',
        email: '',
        subject: 'Invitation to Ghana Competition Law Seminar',
        message: `Dear [Name],\n\nWe are pleased to invite you to the upcoming Ghana Competition Law Seminar.\n\nDate: March 25, 2026\nLocation: Mövenpick Ambassador Hotel, Accra\n\nWe look forward to your participation.\n\nBest regards,\nThe CMC Team`
    });

    useEffect(() => {
        if (isOpen) {
            fetchFirms();
        }
    }, [isOpen]);

    const fetchFirms = async () => {
        try {
            const res = await fetch('/api/firms');
            if (res.ok) {
                const data = await res.json();
                setFirms(data);
            }
        } catch (error) {
            console.error('Failed to fetch firms:', error);
        }
    };

    const [successData, setSuccessData] = useState<{ firmName: string; code: string; email: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch('/api/admin/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firmName: formData.lawFirm,
                    email: formData.email,
                    recipientName: formData.recipientName,
                    subject: formData.subject,
                    message: formData.message
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setSuccessData({
                    firmName: data.firm.name,
                    code: data.firm.code,
                    email: formData.email
                });
            } else {
                alert('Failed to send invitation: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error sending invitation:', error);
            alert('Error sending invitation');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setSuccessData(null);
        onClose();
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
                    >
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl pointer-events-auto flex flex-col max-h-[90vh]">

                            {successData ? (
                                <div className="p-8 text-center flex flex-col items-center justify-center space-y-6">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                        <Send className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold text-slate-900">Invitation Sent!</h2>
                                        <p className="text-slate-600">
                                            An invitation has been sent to <span className="font-semibold text-slate-800">{successData.email}</span>.
                                        </p>
                                    </div>

                                    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-6 relative">
                                        <p className="text-sm text-slate-500 uppercase tracking-widest font-semibold mb-2">Firm Access Code</p>
                                        <p className="text-4xl font-mono font-bold text-slate-900 tracking-wider select-all">{successData.code}</p>
                                        <p className="text-xs text-slate-400 mt-2">This code is required for registration.</p>
                                    </div>

                                    <button
                                        onClick={handleClose}
                                        className="px-8 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors w-full sm:w-auto"
                                    >
                                        Done
                                    </button>
                                </div>
                            ) : (
                                <>
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
                                            onClick={handleClose}
                                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Law Firm</label>
                                                <div className="flex gap-2">
                                                    {!isCustomFirm ? (
                                                        <select
                                                            required
                                                            value={formData.lawFirm}
                                                            onChange={e => {
                                                                if (e.target.value === 'NEW_FIRM_ENTRY') {
                                                                    setIsCustomFirm(true);
                                                                    setFormData({ ...formData, lawFirm: '' });
                                                                } else {
                                                                    setFormData({ ...formData, lawFirm: e.target.value });
                                                                }
                                                            }}
                                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none text-slate-900 transition-all text-sm"
                                                        >
                                                            <option value="" disabled>Select a law firm...</option>
                                                            <option value="NEW_FIRM_ENTRY" className="font-semibold text-blue-600">+ Add New Law Firm</option>
                                                            {firms.map(firm => (
                                                                <option key={firm.name} value={firm.name}>{firm.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div className="flex-1 flex gap-2">
                                                            <div className="relative flex-1">
                                                                <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                                                <input
                                                                    type="text"
                                                                    required
                                                                    autoFocus
                                                                    value={formData.lawFirm}
                                                                    onChange={e => setFormData({ ...formData, lawFirm: e.target.value })}
                                                                    placeholder="Enter new law firm name"
                                                                    className="w-full pl-9 p-2.5 bg-white border border-blue-200 ring-2 ring-blue-50 rounded-lg outline-none text-slate-900 text-sm"
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setIsCustomFirm(false);
                                                                    setFormData({ ...formData, lawFirm: '' });
                                                                }}
                                                                className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
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
                                                onClick={handleClose}
                                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 shadow-sm shadow-slate-200 disabled:opacity-50"
                                            >
                                                <Send className="w-4 h-4" />
                                                {isLoading ? 'Sending...' : 'Send Invitation'}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
