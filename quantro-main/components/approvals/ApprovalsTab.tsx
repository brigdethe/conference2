import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock, User, Mail, Building, Briefcase, MessageSquare } from 'lucide-react';

interface PendingApproval {
    id: number;
    fullName: string;
    email: string;
    phone: string | null;
    company: string | null;
    jobTitle: string | null;
    firmName: string | null;
    firmId: number | null;
    reasonForAttending: string | null;
    registeredAt: string;
}

export const ApprovalsTab: React.FC = () => {
    const [approvals, setApprovals] = useState<PendingApproval[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<number | null>(null);
    const [rejectModal, setRejectModal] = useState<{ id: number; name: string } | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'invited' | 'other'>('all');

    const fetchPendingApprovals = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/registrations/pending-approvals');
            if (res.ok) {
                const data = await res.json();
                setApprovals(data.registrations || []);
            }
        } catch (err) {
            console.error('Error fetching pending approvals:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingApprovals();
    }, []);

    const handleApprove = async (id: number) => {
        setProcessing(id);
        try {
            const res = await fetch(`/api/registrations/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                setApprovals(prev => prev.filter(a => a.id !== id));
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
                setApprovals(prev => prev.filter(a => a.id !== rejectModal.id));
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

    // Filter approvals based on filter type
    const filteredApprovals = approvals.filter(a => {
        if (filterType === 'all') return true;
        if (filterType === 'invited') return a.firmId !== null; // Has a firm = invited
        if (filterType === 'other') return a.firmId === null; // No firm = not invited
        return true;
    });

    const invitedCount = approvals.filter(a => a.firmId !== null).length;
    const otherCount = approvals.filter(a => a.firmId === null).length;

    return (
        <>
            <div className="bg-white rounded-3xl shadow-soft overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Pending Approvals</h2>
                        <p className="text-sm text-slate-500">Review and approve registration requests</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterType === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                All ({approvals.length})
                            </button>
                            <button
                                onClick={() => setFilterType('invited')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterType === 'invited' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Invited Firms ({invitedCount})
                            </button>
                            <button
                                onClick={() => setFilterType('other')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterType === 'other' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Other ({otherCount})
                            </button>
                        </div>
                        <button
                            onClick={fetchPendingApprovals}
                            disabled={loading}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <RefreshCw className="w-8 h-8 animate-spin mb-3" />
                            <p>Loading pending approvals...</p>
                        </div>
                    ) : filteredApprovals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <CheckCircle className="w-12 h-12 mb-3 text-emerald-400" />
                            <p className="text-lg font-medium text-slate-600">All caught up!</p>
                            <p className="text-sm">{approvals.length === 0 ? 'No pending approvals to review' : 'No approvals match this filter'}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredApprovals.map((approval) => (
                                <div
                                    key={approval.id}
                                    className="bg-gradient-to-r from-orange-50 to-white border border-orange-100 rounded-2xl p-5"
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Pending Approval
                                                </span>
                                                <span className="text-xs text-slate-400">REG-{approval.id}</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                    <span className="font-semibold text-slate-900">{approval.fullName}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-slate-400" />
                                                    <span className="text-sm text-slate-600">{approval.email}</span>
                                                </div>
                                                {(approval.firmName || approval.company) && (
                                                    <div className="flex items-center gap-2">
                                                        <Building className="w-4 h-4 text-slate-400" />
                                                        <span className="text-sm text-slate-600">{approval.firmName || approval.company}</span>
                                                    </div>
                                                )}
                                                {approval.jobTitle && (
                                                    <div className="flex items-center gap-2">
                                                        <Briefcase className="w-4 h-4 text-slate-400" />
                                                        <span className="text-sm text-slate-600">{approval.jobTitle}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {approval.reasonForAttending && (
                                                <div className="bg-white border border-orange-100 rounded-xl p-3 mb-3">
                                                    <div className="flex items-start gap-2">
                                                        <MessageSquare className="w-4 h-4 text-orange-400 mt-0.5" />
                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-500 mb-1">Reason for Attending</p>
                                                            <p className="text-sm text-slate-700">{approval.reasonForAttending}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <p className="text-xs text-slate-400">
                                                Applied: {formatDate(approval.registeredAt)}
                                            </p>
                                        </div>

                                        <div className="flex flex-row lg:flex-col gap-2 lg:min-w-[140px]">
                                            <button
                                                onClick={() => handleApprove(approval.id)}
                                                disabled={processing === approval.id}
                                                className="flex-1 lg:w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {processing === approval.id ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-4 h-4" />
                                                        Approve
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => setRejectModal({ id: approval.id, name: approval.fullName })}
                                                disabled={processing === approval.id}
                                                className="flex-1 lg:w-full px-4 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-xs text-gray-500">
                    <span>{approvals.length} pending approval{approvals.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Reject Modal */}
            {rejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Reject Registration</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Are you sure you want to reject <strong>{rejectModal.name}</strong>'s registration? This action cannot be undone.
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
