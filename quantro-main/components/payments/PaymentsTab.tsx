import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, Clock, User, Mail, Building, CreditCard } from 'lucide-react';

interface PendingPayment {
    id: number;
    fullName: string;
    email: string;
    firmName: string | null;
    status: string;
    registeredAt: string;
}

export const PaymentsTab: React.FC = () => {
    const [payments, setPayments] = useState<PendingPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState<number | null>(null);

    const fetchPendingPayments = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/registrations/pending-payments');
            if (res.ok) {
                const data = await res.json();
                setPayments(data.registrations || []);
            }
        } catch (err) {
            console.error('Error fetching pending payments:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingPayments();
    }, []);

    const handleVerifyPayment = async (registrationId: number) => {
        setVerifying(registrationId);
        try {
            const res = await fetch(`/api/registrations/${registrationId}/verify-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                // Remove from list after verification
                setPayments(prev => prev.filter(p => p.id !== registrationId));
            } else {
                alert('Failed to verify payment. Please try again.');
            }
        } catch (err) {
            console.error('Error verifying payment:', err);
            alert('An error occurred. Please try again.');
        } finally {
            setVerifying(null);
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

    return (
        <div className="bg-white rounded-3xl shadow-soft overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Pending Payments</h2>
                    <p className="text-sm text-slate-500">Verify payments to complete registrations</p>
                </div>
                <button
                    onClick={fetchPendingPayments}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Content */}
            <div className="p-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin mb-3" />
                        <p>Loading pending payments...</p>
                    </div>
                ) : payments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <CheckCircle className="w-12 h-12 mb-3 text-emerald-400" />
                        <p className="text-lg font-medium text-slate-600">All caught up!</p>
                        <p className="text-sm">No pending payments to verify</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {payments.map((payment) => (
                            <div
                                key={payment.id}
                                className="bg-gradient-to-r from-amber-50 to-white border border-amber-100 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Awaiting Verification
                                        </span>
                                        <span className="text-xs text-slate-400">REG-{payment.id}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-slate-400" />
                                            <span className="font-semibold text-slate-900">{payment.fullName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm text-slate-600">{payment.email}</span>
                                        </div>
                                        {payment.firmName && (
                                            <div className="flex items-center gap-2">
                                                <Building className="w-4 h-4 text-slate-400" />
                                                <span className="text-sm text-slate-600">{payment.firmName}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm font-medium text-slate-700">GHS 150.00</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">
                                        Submitted: {formatDate(payment.registeredAt)}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    <button
                                        onClick={() => handleVerifyPayment(payment.id)}
                                        disabled={verifying === payment.id}
                                        className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {verifying === payment.id ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-4 h-4" />
                                                Verify Payment
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-xs text-gray-500">
                <span>{payments.length} pending payment{payments.length !== 1 ? 's' : ''}</span>
            </div>
        </div>
    );
};
