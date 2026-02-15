import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Transaction {
    id: string;
    type: 'Bought' | 'Refunded';
    ticketType: 'VIP' | 'Regular';
    amount: number;
    date: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
    { id: '1', type: 'Bought', ticketType: 'VIP', amount: 300, date: '2024-02-15T10:30:00' },
    { id: '2', type: 'Bought', ticketType: 'Regular', amount: 100, date: '2024-02-15T09:15:00' },
    { id: '3', type: 'Refunded', ticketType: 'Regular', amount: 100, date: '2024-02-14T16:45:00' },
    { id: '4', type: 'Bought', ticketType: 'VIP', amount: 300, date: '2024-02-14T14:20:00' },
    { id: '5', type: 'Bought', ticketType: 'Regular', amount: 100, date: '2024-02-14T11:00:00' },
    { id: '6', type: 'Bought', ticketType: 'Regular', amount: 100, date: '2024-02-14T09:30:00' },
    { id: '7', type: 'Bought', ticketType: 'VIP', amount: 300, date: '2024-02-13T15:15:00' },
    { id: '8', type: 'Refunded', ticketType: 'VIP', amount: 300, date: '2024-02-13T12:00:00' },
    { id: '9', type: 'Bought', ticketType: 'Regular', amount: 100, date: '2024-02-13T10:45:00' },
    { id: '10', type: 'Bought', ticketType: 'Regular', amount: 100, date: '2024-02-13T09:00:00' },
];

export const RevenueHistory: React.FC = () => {
    const [filter, setFilter] = useState<'All' | 'Bought' | 'Refunded'>('All');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const totalBoughtVIP = MOCK_TRANSACTIONS.filter(t => t.type === 'Bought' && t.ticketType === 'VIP').length;
    const totalBoughtRegular = MOCK_TRANSACTIONS.filter(t => t.type === 'Bought' && t.ticketType === 'Regular').length;

    const filteredTransactions = MOCK_TRANSACTIONS.filter(t => {
        if (filter === 'All') return true;
        return t.type === filter;
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-800">Recent Transactions</h3>
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </button>

                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10"
                            >
                                <button
                                    onClick={() => { setFilter('All'); setIsMenuOpen(false); }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${filter === 'All' ? 'text-slate-900 font-medium bg-slate-50' : 'text-slate-600'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => { setFilter('Bought'); setIsMenuOpen(false); }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${filter === 'Bought' ? 'text-slate-900 font-medium bg-slate-50' : 'text-slate-600'}`}
                                >
                                    Bought
                                </button>
                                <button
                                    onClick={() => { setFilter('Refunded'); setIsMenuOpen(false); }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${filter === 'Refunded' ? 'text-slate-900 font-medium bg-slate-50' : 'text-slate-600'}`}
                                >
                                    Refunded
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="overflow-x-auto flex-grow">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-slate-900 w-[40%]">Transaction</th>
                            <th className="px-6 py-3 font-semibold text-slate-900 w-[30%]">Ticket</th>
                            <th className="px-6 py-3 font-semibold text-slate-900 text-right w-[30%]">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredTransactions.length > 0 ? (
                            filteredTransactions.map((transaction) => (
                                <tr key={transaction.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${transaction.type === 'Bought' ? 'bg-slate-900' : 'bg-transparent border border-slate-400'}`}></div>
                                            <span className={`font-medium ${transaction.type === 'Bought' ? 'text-slate-900' : 'text-slate-500'}`}>
                                                {transaction.type}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-slate-600">
                                        {transaction.ticketType} Ticket
                                    </td>
                                    <td className={`px-6 py-3.5 text-right font-medium tabular-nums ${transaction.type === 'Bought' ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {transaction.type === 'Refunded' ? '-' : '+'}₵{transaction.amount.toLocaleString()}
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

            <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-200 mt-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-slate-500 mb-1">VIP Sales</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-slate-800 tracking-tight">{totalBoughtVIP}</span>
                            <span className="text-xs text-slate-400 font-medium">tickets</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div>
                        <div className="text-sm font-medium text-slate-500 mb-1">Regular Sales</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-slate-800 tracking-tight">{totalBoughtRegular}</span>
                            <span className="text-xs text-slate-400 font-medium">tickets</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div>
                        <div className="text-sm font-medium text-slate-500 mb-1">Total Sales</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-slate-800 tracking-tight">{totalBoughtVIP + totalBoughtRegular}</span>
                            <span className="text-xs text-slate-400 font-medium">tickets</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
