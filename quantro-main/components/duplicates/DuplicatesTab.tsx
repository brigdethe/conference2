import React, { useState, useEffect } from 'react';
import { RefreshCw, Users, Mail, Phone, User, Trash2, CheckCircle, AlertTriangle, Copy, Building, Loader2 } from 'lucide-react';

interface Registration {
    id: number;
    fullName: string;
    email: string;
    phone: string | null;
    company: string | null;
    jobTitle: string | null;
    status: string;
    ticketCode: string | null;
    ticketType: string | null;
    firmName: string | null;
    registeredAt: string;
}

interface DuplicateGroup {
    match_type: 'email' | 'phone' | 'name';
    match_value: string;
    registrations: Registration[];
}

export const DuplicatesTab: React.FC = () => {
    const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [selectedToKeep, setSelectedToKeep] = useState<{ [groupKey: string]: number }>({});

    const fetchDuplicates = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/registrations/duplicates');
            if (res.ok) {
                const data = await res.json();
                setDuplicateGroups(data.duplicate_groups || []);
            }
        } catch (err) {
            console.error('Error fetching duplicates:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDuplicates();
    }, []);

    const getGroupKey = (group: DuplicateGroup) => `${group.match_type}-${group.match_value}`;

    const handleSelectToKeep = (groupKey: string, regId: number) => {
        setSelectedToKeep(prev => ({ ...prev, [groupKey]: regId }));
    };

    const handleDeleteDuplicate = async (group: DuplicateGroup, deleteId: number) => {
        const groupKey = getGroupKey(group);
        const keepId = selectedToKeep[groupKey];
        
        if (!keepId) {
            alert('Please select which registration to keep first.');
            return;
        }
        
        if (keepId === deleteId) {
            alert('Cannot delete the registration you selected to keep.');
            return;
        }

        if (!window.confirm(`Delete this duplicate and resend ticket to the kept registration?`)) {
            return;
        }

        setProcessing(`${groupKey}-${deleteId}`);
        try {
            const res = await fetch(`/api/registrations/${deleteId}/delete-duplicate?keep_id=${keepId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (res.ok) {
                const data = await res.json();
                alert(data.message);
                fetchDuplicates();
            } else {
                const error = await res.json();
                alert(error.detail || 'Failed to delete duplicate');
            }
        } catch (err) {
            console.error('Error deleting duplicate:', err);
            alert('An error occurred');
        } finally {
            setProcessing(null);
        }
    };

    const getMatchIcon = (type: string) => {
        switch (type) {
            case 'email': return <Mail className="w-4 h-4" />;
            case 'phone': return <Phone className="w-4 h-4" />;
            case 'name': return <User className="w-4 h-4" />;
            default: return <Users className="w-4 h-4" />;
        }
    };

    const getMatchLabel = (type: string) => {
        switch (type) {
            case 'email': return 'Email Match';
            case 'phone': return 'Phone Match';
            case 'name': return 'Name Match';
            default: return 'Match';
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: { [key: string]: string } = {
            confirmed: 'bg-emerald-100 text-emerald-700',
            pending_payment: 'bg-amber-100 text-amber-700',
            pending_approval: 'bg-orange-100 text-orange-700',
            awaiting_verification: 'bg-blue-100 text-blue-700'
        };
        const labels: { [key: string]: string } = {
            confirmed: 'Confirmed',
            pending_payment: 'Pending Payment',
            pending_approval: 'Pending Approval',
            awaiting_verification: 'Awaiting Verification'
        };
        return (
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
                {labels[status] || status}
            </span>
        );
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
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Duplicate Analysis
                    </h2>
                    <p className="text-sm text-slate-500">Find and manage duplicate registrations by phone, email, or name</p>
                </div>
                <button
                    onClick={fetchDuplicates}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="p-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin mb-3" />
                        <p>Analyzing registrations...</p>
                    </div>
                ) : duplicateGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <CheckCircle className="w-12 h-12 mb-3 text-emerald-400" />
                        <p className="text-lg font-medium text-slate-600">No duplicates found!</p>
                        <p className="text-sm">All registrations appear to be unique</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-amber-800">
                                    Found {duplicateGroups.length} potential duplicate group{duplicateGroups.length > 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-amber-700 mt-1">
                                    Select which registration to keep, then delete the duplicates. The kept registration will receive their ticket again.
                                </p>
                            </div>
                        </div>

                        {duplicateGroups.map((group, groupIndex) => {
                            const groupKey = getGroupKey(group);
                            const keepId = selectedToKeep[groupKey];
                            
                            return (
                                <div key={groupKey} className="border border-slate-200 rounded-2xl overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                                        <span className={`p-1.5 rounded-lg ${
                                            group.match_type === 'email' ? 'bg-blue-100 text-blue-600' :
                                            group.match_type === 'phone' ? 'bg-green-100 text-green-600' :
                                            'bg-purple-100 text-purple-600'
                                        }`}>
                                            {getMatchIcon(group.match_type)}
                                        </span>
                                        <span className="text-sm font-semibold text-slate-700">
                                            {getMatchLabel(group.match_type)}:
                                        </span>
                                        <span className="text-sm text-slate-600 font-mono bg-white px-2 py-0.5 rounded border">
                                            {group.match_value}
                                        </span>
                                        <span className="ml-auto text-xs text-slate-500">
                                            {group.registrations.length} registrations
                                        </span>
                                    </div>
                                    
                                    <div className="divide-y divide-slate-100">
                                        {group.registrations.map((reg) => (
                                            <div 
                                                key={reg.id} 
                                                className={`p-4 flex flex-col md:flex-row md:items-center gap-4 transition-colors ${
                                                    keepId === reg.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex-grow space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-slate-900">{reg.fullName}</span>
                                                        {getStatusBadge(reg.status)}
                                                        {reg.ticketCode && (
                                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-mono rounded">
                                                                {reg.ticketCode}
                                                            </span>
                                                        )}
                                                        {keepId === reg.id && (
                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full flex items-center gap-1">
                                                                <CheckCircle className="w-3 h-3" /> Keep
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                                                        <span className="flex items-center gap-1">
                                                            <Mail className="w-3 h-3" /> {reg.email}
                                                        </span>
                                                        {reg.phone && (
                                                            <span className="flex items-center gap-1">
                                                                <Phone className="w-3 h-3" /> {reg.phone}
                                                            </span>
                                                        )}
                                                        {(reg.firmName || reg.company) && (
                                                            <span className="flex items-center gap-1">
                                                                <Building className="w-3 h-3" /> {reg.firmName || reg.company}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400">
                                                        Registered: {formatDate(reg.registeredAt)}
                                                        {reg.ticketType && ` • ${reg.ticketType}`}
                                                    </p>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleSelectToKeep(groupKey, reg.id)}
                                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                                            keepId === reg.id 
                                                                ? 'bg-emerald-600 text-white' 
                                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {keepId === reg.id ? 'Keeping' : 'Keep This'}
                                                    </button>
                                                    
                                                    {keepId && keepId !== reg.id && (
                                                        <button
                                                            onClick={() => handleDeleteDuplicate(group, reg.id)}
                                                            disabled={processing === `${groupKey}-${reg.id}`}
                                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                                        >
                                                            {processing === `${groupKey}-${reg.id}` ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-3 h-3" />
                                                            )}
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-xs text-gray-500">
                <span>Total duplicate groups: {duplicateGroups.length}</span>
            </div>
        </div>
    );
};
