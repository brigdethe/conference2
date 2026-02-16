import React from 'react';
import type { DashboardSidebarContent, FirmActivityDetail } from '../../data/dashboard';

interface InvitedFirmsListProps {
  firms: FirmActivityDetail[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onOpenDetail?: (detail: DashboardSidebarContent) => void;
}

export const InvitedFirmsList: React.FC<InvitedFirmsListProps> = ({
  firms,
  isLoading = false,
  error = null,
  onRetry,
  onOpenDetail,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-soft h-[500px] flex flex-col overflow-hidden">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Invited Firms</h2>
          <p className="text-sm text-gray-500">Firm list and assigned access codes</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {firms.length} firms
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">Unable to load invited firms.</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {isLoading && (
          <>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-2xl border border-slate-100 p-4">
                <div className="mb-2 h-4 w-1/2 rounded bg-slate-100" />
                <div className="mb-3 h-3 w-1/3 rounded bg-slate-100" />
                <div className="h-3 w-2/3 rounded bg-slate-100" />
              </div>
            ))}
          </>
        )}

        {!isLoading && firms.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-sm font-medium text-slate-600">No firms invited yet.</p>
          </div>
        )}

        {!isLoading &&
          firms.map((firm) => (
            <button
              key={firm.code}
              type="button"
              onClick={() => onOpenDetail?.({ kind: 'firmActivity', firm })}
              className="w-full rounded-2xl border border-slate-100 p-4 text-left transition-colors hover:border-slate-200 hover:bg-slate-50"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-slate-900">{firm.name}</p>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] font-semibold text-slate-700">
                  {firm.code}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>Total: {firm.totalRegistrations}</span>
                <span>Access Code: {firm.confirmedAccessCode}</span>
                <span>Paid: {firm.confirmedPaid}</span>
                <span>Pending: {firm.pendingPayment}</span>
              </div>
            </button>
          ))}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
      `}</style>
    </div>
  );
};
