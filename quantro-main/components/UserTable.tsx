import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, MoreHorizontal, Phone, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { User } from '../data/users';

interface UserTableProps {
    users: User[];
    isLoading?: boolean;
    error?: string | null;
    onRetry?: () => void;
    onUserSelect?: (user: User) => void;
}

export const UserTable: React.FC<UserTableProps> = ({
    users,
    isLoading = false,
    error = null,
    onRetry,
    onUserSelect,
}) => {
    const [expandedRows, setExpandedRows] = useState<number[]>([]);
    const [activeActionRow, setActiveActionRow] = useState<number | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const [activeButton, setActiveButton] = useState<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const toggleRow = (id: number) => {
        setExpandedRows(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        );
    };

    const toggleActionMenu = (id: number, button: HTMLButtonElement) => {
        if (activeActionRow === id) {
            setActiveActionRow(null);
            setActiveButton(null);
            return;
        }

        const rect = button.getBoundingClientRect();
        const menuWidth = 192;
        const menuHeight = 120;
        const gap = 8;

        let left = rect.right - menuWidth;
        left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

        let top = rect.bottom + gap;
        if (top + menuHeight > window.innerHeight - 8) {
            top = rect.top - menuHeight - gap;
        }
        top = Math.max(8, top);

        setMenuPosition({ top, left });
        setActiveButton(button);
        setActiveActionRow(id);
    };

    useEffect(() => {
        if (activeActionRow === null) return;

        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuRef.current?.contains(target)) return;
            if (activeButton?.contains(target)) return;
            setActiveActionRow(null);
            setActiveButton(null);
        };

        const closeMenu = () => {
            setActiveActionRow(null);
            setActiveButton(null);
        };

        document.addEventListener('mousedown', onPointerDown);
        window.addEventListener('scroll', closeMenu, true);
        window.addEventListener('resize', closeMenu);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            window.removeEventListener('scroll', closeMenu, true);
            window.removeEventListener('resize', closeMenu);
        };
    }, [activeActionRow, activeButton]);

    const activeUser = useMemo(
        () => users.find((u) => u.id === activeActionRow) ?? null,
        [users, activeActionRow]
    );

    return (
        <div className="bg-white">


            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200">


                            <th className="py-4 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.12em]">Full Name</th>
                            <th className="py-4 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.12em] hidden xl:table-cell">Job Title</th>
                            <th className="py-4 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.12em] hidden lg:table-cell">Organization</th>
                            {/* <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Phone / Email</th> */}
                            <th className="py-4 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.12em] hidden sm:table-cell">Guest Type</th>
                            <th className="py-4 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.12em] text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {isLoading && (
                            <tr>
                                <td colSpan={5} className="py-14 px-6 text-center text-sm text-slate-500">
                                    Loading users...
                                </td>
                            </tr>
                        )}

                        {!isLoading && error && (
                            <tr>
                                <td colSpan={5} className="py-14 px-6 text-center">
                                    <p className="text-sm text-red-600 mb-3">{error}</p>
                                    <button
                                        onClick={onRetry}
                                        className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                                    >
                                        Retry
                                    </button>
                                </td>
                            </tr>
                        )}

                        {!isLoading && !error && users.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-14 px-6 text-center text-sm text-slate-500">
                                    No users found.
                                </td>
                            </tr>
                        )}

                        {!isLoading && !error && users.map((user) => (
                            <React.Fragment key={user.id}>
                                <tr
                                    onClick={() => onUserSelect?.(user)}
                                    className={`group hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0 relative ${onUserSelect ? 'cursor-pointer' : ''}`}
                                >
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3 min-w-[220px]">
                                            <div className="min-w-0">
                                                <div className="font-semibold text-slate-900 truncate">{user.fullName}</div>
                                                <div className="text-xs text-slate-500 truncate">{user.email || 'No email provided'}</div>
                                            </div>
                                            {/* Mobile Expand Button - Visible only when columns are hidden */}
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    toggleRow(user.id);
                                                }}
                                                className="ml-1 p-1 rounded-full hover:bg-slate-200 text-slate-400 xl:hidden"
                                            >
                                                {expandedRows.includes(user.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-slate-700 hidden xl:table-cell">{user.jobTitle || '—'}</td>
                                    <td className="py-4 px-6 text-slate-700 hidden lg:table-cell">{user.organization || user.lawFirm || user.company || '—'}</td>
                                    {/* Phone/Email Column Removed */}
                                    <td className="px-6 py-4 hidden sm:table-cell">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${user.ticketType === 'Paid'
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-white text-slate-600 border-slate-300'
                                            }`}>
                                            {user.ticketType || 'Access Code'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right relative">
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                toggleActionMenu(user.id, event.currentTarget);
                                            }}
                                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                                {/* Expandable Details Row */}
                                <AnimatePresence>
                                    {expandedRows.includes(user.id) && (
                                        <tr className="bg-slate-50/70 xl:hidden">
                                            <td colSpan={5} className="p-0">
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                                        <div className="xl:hidden">
                                                            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em] mb-1">Job Title</div>
                                                            <div className="text-slate-700">{user.jobTitle || '—'}</div>
                                                        </div>
                                                        <div className="lg:hidden">
                                                            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em] mb-1">Organization</div>
                                                            <div className="text-slate-700">{user.organization || user.lawFirm || user.company || '—'}</div>
                                                        </div>
                                                        <div className="md:hidden">
                                                            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em] mb-1">Contact</div>
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2 text-slate-700"><Mail className="w-3 h-3" /> {user.email || 'No email provided'}</div>
                                                                <div className="flex items-center gap-2 text-slate-700"><Phone className="w-3 h-3" /> {user.phone || 'No phone provided'}</div>
                                                            </div>
                                                        </div>
                                                        <div className="sm:hidden">
                                                            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em] mb-1">Attendance</div>
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${user.attendanceType === 'In-Person'
                                                                ? 'bg-slate-900 text-white border-slate-900'
                                                                : 'bg-white text-slate-600 border-slate-300'
                                                                }`}>
                                                                {user.attendanceType}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {activeUser && (
                        <motion.div
                            ref={menuRef}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            style={{ top: menuPosition.top, left: menuPosition.left }}
                            className="fixed w-48 bg-white rounded-xl shadow-[0_16px_35px_rgba(15,23,42,0.18)] border border-slate-200 z-[1000] overflow-hidden"
                        >
                            <div className="py-1">
                                {activeUser.phone && (
                                    <a href={`tel:${activeUser.phone}`} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        Call
                                    </a>
                                )}
                                {activeUser.email && (
                                    <a href={`mailto:${activeUser.email}`} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        Email
                                    </a>
                                )}
                                {!activeUser.phone && !activeUser.email && (
                                    <div className="px-4 py-2 text-sm text-slate-400">No contact info</div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};
