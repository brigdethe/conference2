import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  DashboardMetrics,
  DashboardSidebarContent,
  DashboardTransaction,
  DashboardTicketTypeDetail,
} from '../../data/dashboard';

interface RevenueHistoryProps {
  transactions: DashboardTransaction[];
  revenueByTicketType: DashboardMetrics['revenueByTicketType'];
  ticketTypeDetails: {
    AccessCode: DashboardTicketTypeDetail;
    Paid: DashboardTicketTypeDetail;
  };
  onOpenDetail?: (detail: DashboardSidebarContent) => void;
}

const formatCurrency = (amount: number) =>
  `${amount < 0 ? '-' : ''}GHS ${Math.abs(amount).toLocaleString()}`;

export const RevenueHistory: React.FC<RevenueHistoryProps> = ({
  transactions,
  revenueByTicketType,
  ticketTypeDetails,
  onOpenDetail,
}) => {
  const [filter, setFilter] = useState<'All' | 'Bought' | 'Refunded'>('All');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredTransactions = transactions.filter((transaction) => {
    if (filter === 'All') return true;
    return transaction.type === filter;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <h3 className="text-base font-semibold text-slate-800">Recent Transactions</h3>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 top-full z-10 mt-1 w-32 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                <button
                  onClick={() => {
                    setFilter('All');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${filter === 'All' ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-600'}`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setFilter('Bought');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${filter === 'Bought' ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-600'}`}
                >
                  Bought
                </button>
                <button
                  onClick={() => {
                    setFilter('Refunded');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${filter === 'Refunded' ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-600'}`}
                >
                  Refunded
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-grow overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-white font-medium text-slate-500">
            <tr>
              <th className="w-[40%] px-6 py-3 font-semibold text-slate-900">Transaction</th>
              <th className="w-[30%] px-6 py-3 font-semibold text-slate-900">Ticket</th>
              <th className="w-[30%] px-6 py-3 text-right font-semibold text-slate-900">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  onClick={() => onOpenDetail?.({ kind: 'transaction', transaction })}
                  className="group cursor-pointer transition-colors hover:bg-slate-50/50"
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${transaction.type === 'Bought' ? 'bg-slate-900' : 'border border-slate-400 bg-transparent'}`}
                      ></div>
                      <span
                        className={`font-medium ${transaction.type === 'Bought' ? 'text-slate-900' : 'text-slate-500'}`}
                      >
                        {transaction.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">{transaction.ticketType} Ticket</td>
                  <td
                    className={`px-6 py-3.5 text-right font-medium tabular-nums ${transaction.type === 'Bought' ? 'text-slate-900' : 'text-slate-400'}`}
                  >
                    {transaction.type === 'Refunded' ? '-' : '+'}GHS {transaction.amount.toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                  No {filter.toLowerCase()} transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-auto border-t border-slate-200 bg-slate-50/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onOpenDetail?.({ kind: 'ticketType', ticketType: ticketTypeDetails.AccessCode })}
            className="text-left transition-opacity hover:opacity-80"
          >
            <div className="mb-1 text-sm font-medium text-slate-500">
              Access Code Total ({revenueByTicketType.AccessCode.count})
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight text-slate-800">
                {formatCurrency(revenueByTicketType.AccessCode.amount)}
              </span>
            </div>
          </button>

          <div className="h-8 w-px bg-slate-200"></div>

          <button
            type="button"
            onClick={() =>
              onOpenDetail?.({ kind: 'ticketType', ticketType: ticketTypeDetails.Paid })
            }
            className="text-left transition-opacity hover:opacity-80"
          >
            <div className="mb-1 text-sm font-medium text-slate-500">
              Paid Total ({revenueByTicketType.Paid.count})
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight text-slate-800">
                {formatCurrency(revenueByTicketType.Paid.amount)}
              </span>
            </div>
          </button>

          <div className="h-8 w-px bg-slate-200"></div>

          <button
            type="button"
            onClick={() => onOpenDetail?.({ kind: 'revenueTotal', revenueByTicketType })}
            className="text-left transition-opacity hover:opacity-80"
          >
            <div className="mb-1 text-sm font-medium text-slate-500">
              Total Revenue ({revenueByTicketType.total.count})
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight text-slate-800">
                {formatCurrency(revenueByTicketType.total.amount)}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
