import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock, User, Mail, Building, Briefcase, MessageSquare, Eye } from 'lucide-react';

interface Registration {
    id: number;
    fullName: string;
    email: string;
    phone: string | null;
    company: string | null;
    jobTitle: string | null;
    firmName: string | null;
    firmId: number | null;
    status?: string;
    reasonForAttending: string | null;
    registeredAt: string;
    approvedAt?: string | null;
}

type TabType = 'pending' | 'approved' | 'rejected';

export const ApprovalsTab: React.FC = () => {
    const [pendingList, setPendingList] = useState<Registration[]>([]);
    const [approvedList, setApprovedList] = useState<Registration[]>([]);
    const [rejectedList, setRejectedList] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<number | null>(null);
    const [rejectModal, setRejectModal] = useState<{ id: number; name: string } | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [viewModal, setViewModal] = useState<Registration | null>(null);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
                fetch('/api/registrations/pending-approvals'),
                fetch('/api/registrations/approved-registrations'),
                fetch('/api/registrations/rejected-registrations')
            ]);
            
            if (pendingRes.ok) {
                const data = await pendingRes.json();
                setPendingList(data.registrations || []);
            }
            if (approvedRes.ok) {
                const data = await approvedRes.json();
                setApprovedList(data.registrations || []);
            }
            if (rejectedRes.ok) {
                const data = await rejectedRes.json();
                setRejectedList(data.registrations || []);
            }
        } catch (err) {
            console.error('Error fetching registrations:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleApprove = async (id: number) => {
        setProcessing(id);
        try {
            const res = await fetch(`/api/registrations/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                fetchAllData();
            } else {
                alert('Failed to approve registration. Please try again.');
            }
        } catch (err) {
            console.error('Error approving registration:', err);
            alert('An error occurred. Please try again.');
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async () => {
        if (!rejectModal) return;
        
        setProcessing(rejectModal.id);
        try {
            const res = await fetch(`/api/registrations/${rejectModal.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: rejectReason || null })
            });
            if (res.ok) {
                fetchAllData();
                setRejectModal(null);
                setRejectReason('');
            } else {
                alert('Failed to reject registration. Please try again.');
            }
        } catch (err) {
            console.error('Error rejecting registration:', err);
            alert('An error occurred. Please try again.');
        } finally {
            setProcessing(null);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const currentList = activeTab === 'pending' ? pendingList : activeTab === 'approved' ? approvedList : rejectedList;

    const getStatusBadge = (status?: string) => {
        if (status === 'confirmed') return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">Confirmed</span>;
        if (status === 'pending_payment') return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">Awaiting Payment</span>;
        return null;
    };

    return (
        <>
            <div className="bg-white rounded-3xl shadow-soft overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Registration Approvals</h2>
                        <p className="text-sm text-slate-500">Manage pending, approved, and rejected registrations</p>
                    </div>
                    <button
                        onClick={fetchAllData}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-100">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'pending' ? 'border-orange-500 text-orange-600 bg-orange-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <Clock className="w-4 h-4 inline mr-1.5" />
                            Pending ({pendingList.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('approved')}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'approved' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <CheckCircle className="w-4 h-4 inline mr-1.5" />
                            Approved ({approvedList.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('rejected')}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'rejected' ? 'border-red-500 text-red-600 bg-red-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <XCircle className="w-4 h-4 inline mr-1.5" />
                            Rejected ({rejectedList.length})
                        </button>
                    </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <RefreshCw className="w-8 h-8 animate-spin mb-3" />
                            <p>Loading registrations...</p>
                        </div>
                    ) : currentList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            {activeTab === 'pending' && <Clock className="w-12 h-12 mb-3 text-orange-300" />}
                            {activeTab === 'approved' && <CheckCircle className="w-12 h-12 mb-3 text-emerald-300" />}
                            {activeTab === 'rejected' && <XCircle className="w-12 h-12 mb-3 text-red-300" />}
                            <p className="text-lg font-medium text-slate-600">No {activeTab} registrations</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Organization</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    {activeTab === 'approved' && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>}
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentList.map((reg) => (
                                    <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm">
                                                    {reg.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 text-sm">{reg.fullName}</p>
                                                    <p className="text-xs text-slate-400">{reg.jobTitle || '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{reg.email}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{reg.firmName || reg.company || '—'}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500">{formatDate(reg.registeredAt)}</td>
                                        {activeTab === 'approved' && <td className="px-4 py-3">{getStatusBadge(reg.status)}</td>}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setViewModal(reg)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {activeTab === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(reg.id)}
                                                            disabled={processing === reg.id}
                                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                                                        >
                                                            {processing === reg.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Approve'}
                                                        </button>
                                                        <button
                                                            onClick={() => setRejectModal({ id: reg.id, name: reg.fullName })}
                                                            disabled={processing === reg.id}
                                                            className="px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-xs text-gray-500">
                    <span>Total: {pendingList.length} pending, {approvedList.length} approved, {rejectedList.length} rejected</span>
                </div>
            </div>

            {/* View Details Modal */}
            {viewModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-slate-900">Registration Details</h3>
                            <button onClick={() => setViewModal(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="font-semibold text-slate-900">{viewModal.fullName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600">{viewModal.email}</span>
                            </div>
                            {viewModal.phone && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600">📞 {viewModal.phone}</span>
                                </div>
                            )}
                            {(viewModal.firmName || viewModal.company) && (
                                <div className="flex items-center gap-2">
                                    <Building className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm text-slate-600">{viewModal.firmName || viewModal.company}</span>
                                </div>
                            )}
                            {viewModal.jobTitle && (
                                <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm text-slate-600">{viewModal.jobTitle}</span>
                                </div>
                            )}
                            {viewModal.reasonForAttending && (
                                <div className="bg-slate-50 rounded-xl p-3 mt-3">
                                    <div className="flex items-start gap-2">
                                        <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 mb-1">Reason for Attending</p>
                                            <p className="text-sm text-slate-700">{viewModal.reasonForAttending}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-slate-400 mt-3">Applied: {formatDate(viewModal.registeredAt)}</p>
                            {viewModal.approvedAt && <p className="text-xs text-slate-400">Approved: {formatDate(viewModal.approvedAt)}</p>}
                        </div>

                        <button
                            onClick={() => setViewModal(null)}
                            className="w-full mt-4 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Reject Registration</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Are you sure you want to reject <strong>{rejectModal.name}</strong>'s registration? They will be able to re-apply later.
                        </p>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Reason (optional)
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Provide a reason for rejection..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300"
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setRejectModal(null);
                                    setRejectReason('');
                                }}
                                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={processing === rejectModal.id}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {processing === rejectModal.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    'Reject'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
