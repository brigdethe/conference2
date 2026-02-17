import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Building2, Copy, Check, LayoutGrid, List, Download, Trash2, X, Users, Loader2, Pencil, Filter } from 'lucide-react';

interface Registration {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  status: string;
  ticket_type: string;
  ticket_code: string | null;
  created_at: string;
}

interface Firm {
  id: number;
  name: string;
  code: string;
  email: string | null;
  created_at: string;
  registration_count: number;
  confirmed_count: number;
  free_slots_remaining: number;
  required_registrations: number;
  is_law_firm: boolean;
  logo_url: string | null;
}

interface FirmDetail {
  name: string;
  code: string;
  email: string | null;
  total_registrations: number;
  confirmed_access_code: number;
  confirmed_paid: number;
  pending_payment: number;
  free_slots_remaining: number;
  registrations: Registration[];
}

interface FirmsTabProps {
  onFirmCreated?: () => void;
}

export const FirmsTab: React.FC<FirmsTabProps> = ({ onFirmCreated }) => {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFirmName, setNewFirmName] = useState('');
  const [newFirmEmail, setNewFirmEmail] = useState('');
  const [newFirmRequired, setNewFirmRequired] = useState(1);
  const [newFirmIsLawFirm, setNewFirmIsLawFirm] = useState(false);
  const [newFirmLogoUrl, setNewFirmLogoUrl] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRequired, setEditRequired] = useState(1);
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [selectedFirm, setSelectedFirm] = useState<FirmDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFirm, setEditingFirm] = useState<Firm | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editIsLawFirm, setEditIsLawFirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'law_firm' | 'organization'>('all');

  const filteredFirms = useMemo(() => {
    if (filterType === 'all') return firms;
    if (filterType === 'law_firm') return firms.filter(f => f.is_law_firm);
    return firms.filter(f => !f.is_law_firm);
  }, [firms, filterType]);

  const fetchFirms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/firms');
      if (!res.ok) throw new Error('Failed to fetch firms');
      const data = await res.json();
      setFirms(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load firms');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFirms();
  }, [fetchFirms]);

  const handleCreateFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirmName.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/firms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newFirmName.trim(), 
          email: newFirmEmail.trim() || null,
          required_registrations: newFirmRequired,
          is_law_firm: newFirmIsLawFirm,
          logo_url: newFirmLogoUrl.trim() || null
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create firm');
      }

      setNewFirmName('');
      setNewFirmEmail('');
      setNewFirmRequired(1);
      setNewFirmIsLawFirm(false);
      setNewFirmLogoUrl('');
      setShowAddModal(false);
      fetchFirms();
      onFirmCreated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create firm');
    } finally {
      setIsCreating(false);
    }
  };

  const copyCode = (code: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const openEditModal = (firm: Firm, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingFirm(firm);
    setEditName(firm.name);
    setEditEmail(firm.email || '');
    setEditRequired(firm.required_registrations);
    setEditLogoUrl(firm.logo_url || '');
    setEditIsLawFirm(firm.is_law_firm);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingFirm) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/firms/${editingFirm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim() || null,
          required_registrations: editRequired,
          logo_url: editLogoUrl.trim() || null,
          is_law_firm: editIsLawFirm,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to update');
      }
      setShowEditModal(false);
      setEditingFirm(null);
      fetchFirms();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFirm = async (firmId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to delete this organization?')) return;
    
    setDeletingId(firmId);
    try {
      const res = await fetch(`/api/firms/${firmId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to delete firm');
      }
      fetchFirms();
      onFirmCreated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete firm');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFirmClick = async (firmCode: string) => {
    setIsLoadingDetail(true);
    try {
      const res = await fetch('/api/firms/activity');
      if (!res.ok) throw new Error('Failed to fetch firm details');
      const data = await res.json();
      const firmDetail = data.firms?.find((f: FirmDetail) => f.code === firmCode);
      if (firmDetail) {
        setSelectedFirm(firmDetail);
      }
    } catch (err) {
      console.error('Failed to load firm details:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Code', 'Registrations', 'Confirmed', 'Free Slots', 'Created At'];
    const rows = firms.map(f => [
      f.name,
      f.code,
      f.registration_count,
      f.confirmed_count,
      f.free_slots_remaining,
      new Date(f.created_at).toLocaleDateString()
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `law-firms-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Organizations</h2>
          <p className="text-sm text-slate-500">Manage invited organizations and their access codes</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'law_firm' | 'organization')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">All ({firms.length})</option>
            <option value="law_firm">Law Firms ({firms.filter(f => f.is_law_firm).length})</option>
            <option value="organization">Companies ({firms.filter(f => !f.is_law_firm).length})</option>
          </select>
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-md p-1.5 transition-colors ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`rounded-md p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={exportCSV}
            disabled={firms.length === 0}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Firm
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={fetchFirms} className="mt-2 text-sm font-medium text-red-700 underline">
            Retry
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      )}

      {!isLoading && firms.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Building2 className="mb-4 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No firms added yet</p>
          <p className="mt-1 text-xs text-slate-400">Add a law firm to generate an access code</p>
        </div>
      )}

      {!isLoading && firms.length > 0 && viewMode === 'table' && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-soft overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-4">Logo</th>
                <th className="px-4 py-4">Organization</th>
                <th className="px-4 py-4">Type</th>
                <th className="px-4 py-4">Access Code</th>
                <th className="px-4 py-4">Registered</th>
                <th className="px-4 py-4" title="Number of free registration slots allocated">Quota</th>
                <th className="px-4 py-4">Free Slots</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFirms.map((firm) => (
                <tr
                  key={firm.id}
                  onClick={() => handleFirmClick(firm.code)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-4">
                    {firm.logo_url ? (
                      <img src={firm.logo_url} alt={firm.name} className="h-8 w-8 rounded-lg object-contain bg-slate-100" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-slate-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <span className="font-medium text-slate-900">{firm.name}</span>
                      {firm.email && <p className="text-xs text-slate-500">{firm.email}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${firm.is_law_firm ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {firm.is_law_firm ? 'Law Firm' : 'Company'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={(e) => copyCode(firm.code, e)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      {firm.code}
                      {copiedCode === firm.code ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-slate-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">{firm.confirmed_count}</td>
                  <td className="px-4 py-4 text-sm font-medium text-slate-900">{firm.required_registrations}</td>
                  <td className="px-4 py-4">
                    <span className={`text-sm font-medium ${firm.free_slots_remaining > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                      {firm.free_slots_remaining}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => openEditModal(firm, e)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        title="Edit organization"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteFirm(firm.id, e)}
                        disabled={deletingId === firm.id || firm.registration_count > 0}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={firm.registration_count > 0 ? 'Cannot delete with registrations' : 'Delete'}
                      >
                        {deletingId === firm.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && firms.length > 0 && viewMode === 'cards' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {firms.map((firm) => (
            <div
              key={firm.id}
              onClick={() => handleFirmClick(firm.code)}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft cursor-pointer hover:border-slate-200 transition-colors"
            >
              <div className="mb-3 flex items-start justify-between">
                <h3 className="font-semibold text-slate-900">{firm.name}</h3>
                <button
                  onClick={(e) => copyCode(firm.code, e)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {firm.code}
                  {copiedCode === firm.code ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-slate-400" />
                  )}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">Registrations:</span>{' '}
                  <span className="font-medium">{firm.registration_count}</span>
                </div>
                <div>
                  <span className="text-slate-400">Confirmed:</span>{' '}
                  <span className="font-medium">{firm.confirmed_count}</span>
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400">Free slots:</span>{' '}
                    <span className={`font-medium ${firm.free_slots_remaining > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                      {firm.free_slots_remaining} remaining
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteFirm(firm.id, e)}
                    disabled={deletingId === firm.id || firm.registration_count > 0}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    {deletingId === firm.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Add New Organization</h3>
              <form onSubmit={handleCreateFirm}>
                <input
                  type="text"
                  value={newFirmName}
                  onChange={(e) => setNewFirmName(e.target.value)}
                  placeholder="Organization name"
                  className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  autoFocus
                />
                <input
                  type="email"
                  value={newFirmEmail}
                  onChange={(e) => setNewFirmEmail(e.target.value)}
                  placeholder="Contact email (optional)"
                  className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
                />
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Free Slots (Quota)</label>
                    <input
                      type="number"
                      min={1}
                      value={newFirmRequired}
                      onChange={(e) => setNewFirmRequired(parseInt(e.target.value) || 1)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newFirmIsLawFirm}
                        onChange={(e) => setNewFirmIsLawFirm(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      Is Law Firm
                    </label>
                  </div>
                </div>
                <input
                  type="url"
                  value={newFirmLogoUrl}
                  onChange={(e) => setNewFirmLogoUrl(e.target.value)}
                  placeholder="Logo URL (optional)"
                  className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
                />
                {newFirmLogoUrl && (
                  <div className="mb-4 flex justify-center">
                    <img src={newFirmLogoUrl} alt="Logo preview" className="h-16 w-16 rounded-lg object-contain bg-slate-100 border border-slate-200" />
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newFirmName.trim()}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create Firm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {selectedFirm && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedFirm(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-100 p-2">
                    <Building2 className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{selectedFirm.name}</h3>
                    <p className="text-xs text-slate-500">
                      Code: {selectedFirm.code}
                      {selectedFirm.email && <span className="ml-2">| {selectedFirm.email}</span>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFirm(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 border-b border-slate-100 px-6 py-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{selectedFirm.total_registrations}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedFirm.confirmed_access_code}</p>
                  <p className="text-xs text-slate-500">Free</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{selectedFirm.confirmed_paid}</p>
                  <p className="text-xs text-slate-500">Paid</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{selectedFirm.pending_payment}</p>
                  <p className="text-xs text-slate-500">Pending</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-slate-400" />
                  <h4 className="font-medium text-slate-900">Registrations</h4>
                </div>

                {selectedFirm.registrations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="mb-3 h-10 w-10 text-slate-300" />
                    <p className="text-sm text-slate-500">No registrations yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedFirm.registrations.map((reg) => (
                      <div
                        key={reg.id}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-slate-900">{reg.full_name}</p>
                            <p className="text-xs text-slate-500">{reg.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {reg.ticket_code && (
                              <span className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-mono font-semibold text-slate-700">
                                {reg.ticket_code}
                              </span>
                            )}
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                reg.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {reg.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {reg.job_title && <span>{reg.job_title}</span>}
                          {reg.phone && <span>{reg.phone}</span>}
                          <span
                            className={`font-medium ${
                              reg.ticket_type === 'Access Code' ? 'text-green-600' : 'text-blue-600'
                            }`}
                          >
                            {reg.ticket_type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {isLoadingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {showEditModal && editingFirm && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEditModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Edit Organization</h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Contact email (optional)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Quota (Free Slots)</label>
                    <input
                      type="number"
                      min={1}
                      value={editRequired}
                      onChange={(e) => setEditRequired(parseInt(e.target.value) || 1)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editIsLawFirm}
                        onChange={(e) => setEditIsLawFirm(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      Is Law Firm
                    </label>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Logo URL</label>
                  <input
                    type="url"
                    value={editLogoUrl}
                    onChange={(e) => setEditLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  />
                </div>
                {editLogoUrl && (
                  <div className="flex justify-center">
                    <img src={editLogoUrl} alt="Logo preview" className="h-16 w-16 rounded-lg object-contain bg-slate-100 border border-slate-200" />
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editName.trim()}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
