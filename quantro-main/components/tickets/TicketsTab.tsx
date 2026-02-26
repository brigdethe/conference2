import React, { useState, useEffect, useCallback } from 'react';
import { QrCode, Search, CheckCircle2, Clock, Loader2, Camera } from 'lucide-react';
import { QRScanner } from './QRScanner';

interface Ticket {
  id: number;
  ticket_code: string;
  full_name: string;
  email: string;
  firm_name: string | null;
  ticket_type: string;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
}

interface CheckInResult {
  valid: boolean;
  already_checked_in: boolean;
  checked_in_at: string | null;
  registration: {
    id: number;
    full_name: string;
    email: string;
    firm_name: string | null;
    ticket_type: string;
  };
}

export const TicketsTab: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [stats, setStats] = useState({ total_tickets: 0, checked_in: 0, remaining: 0 });
  const [showScanner, setShowScanner] = useState(false);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        fetch('/api/tickets'),
        fetch('/api/tickets/checkins/stats'),
      ]);
      
      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        setTickets(data.tickets || []);
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleVerify = async () => {
    if (!searchCode.trim()) return;
    
    setIsChecking(true);
    setCheckInResult(null);
    setCheckInMessage(null);
    
    try {
      const res = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_code: searchCode.trim().toUpperCase() }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        setCheckInMessage({ type: 'error', text: err.detail || 'Ticket not found' });
        return;
      }
      
      const data: CheckInResult = await res.json();
      setCheckInResult(data);
      
      if (data.already_checked_in) {
        setCheckInMessage({ 
          type: 'warning', 
          text: `Already checked in at ${new Date(data.checked_in_at!).toLocaleString()}` 
        });
      }
    } catch (err) {
      setCheckInMessage({ type: 'error', text: 'Failed to verify ticket' });
    } finally {
      setIsChecking(false);
    }
  };

  const handleCheckIn = async () => {
    if (!searchCode.trim()) return;
    
    setIsChecking(true);
    setCheckInMessage(null);
    
    try {
      const res = await fetch('/api/tickets/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_code: searchCode.trim().toUpperCase() }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setCheckInMessage({ type: 'success', text: 'Check-in successful' });
        setSearchCode('');
        setCheckInResult(null);
        fetchTickets();
      } else {
        setCheckInMessage({ type: 'warning', text: data.message || 'Already checked in' });
      }
    } catch (err) {
      setCheckInMessage({ type: 'error', text: 'Failed to check in' });
    } finally {
      setIsChecking(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Check-in</h2>
          <p className="text-sm text-slate-500">Verify and check in attendees</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
          <p className="text-sm text-slate-500">Total Tickets</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total_tickets}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
          <p className="text-sm text-slate-500">Checked In</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{stats.checked_in}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
          <p className="text-sm text-slate-500">Remaining</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{stats.remaining}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Check-in</h3>
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            <Camera className="h-4 w-4" />
            Scan QR
          </button>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              placeholder="Enter 4-digit ticket code"
              maxLength={4}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-mono uppercase tracking-widest text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
            />
          </div>
          <button
            onClick={handleVerify}
            disabled={isChecking || !searchCode.trim()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Verify
          </button>
          <button
            onClick={handleCheckIn}
            disabled={isChecking || !searchCode.trim()}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isChecking && <Loader2 className="h-4 w-4 animate-spin" />}
            Check In
          </button>
        </div>

        {checkInMessage && (
          <div
            className={`mt-4 rounded-xl border p-4 ${
              checkInMessage.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : checkInMessage.type === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            <p className="text-sm font-medium">{checkInMessage.text}</p>
          </div>
        )}

        {checkInResult && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{checkInResult.registration.full_name}</p>
                <p className="text-sm text-slate-500">{checkInResult.registration.email}</p>
                {checkInResult.registration.firm_name && (
                  <p className="text-sm text-slate-500">{checkInResult.registration.firm_name}</p>
                )}
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  checkInResult.registration.ticket_type === 'Access Code'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {checkInResult.registration.ticket_type}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-soft">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="font-semibold text-slate-900">All Tickets</h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <QrCode className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">No tickets issued yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Firm</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-slate-900">
                      {ticket.ticket_code}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{ticket.full_name}</p>
                      <p className="text-xs text-slate-500">{ticket.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {ticket.firm_name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          ticket.ticket_type === 'Access Code'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {ticket.ticket_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {ticket.checked_in ? (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs font-medium">
                            {formatDate(ticket.checked_in_at!)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs font-medium">Pending</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(data) => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.ticketCode) {
              setSearchCode(parsed.ticketCode);
              handleCheckIn();
            }
          } catch {
            setSearchCode(data.toUpperCase());
          }
        }}
      />
    </div>
  );
};
