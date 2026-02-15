import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { DashboardSidebarContent } from '../../data/dashboard';

interface DetailsSidebarProps {
  detail: DashboardSidebarContent | null;
  onClose: () => void;
}

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatCurrency = (amount: number) =>
  `${amount < 0 ? '-' : ''}GHS ${Math.abs(amount).toLocaleString()}`;

const DetailLine: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5">
    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
      {label}
    </span>
    <span className="max-w-[65%] break-words text-right text-sm font-medium text-slate-800">
      {value || '-'}
    </span>
  </div>
);

function SidebarContent({ detail }: { detail: DashboardSidebarContent }) {
  if (detail.kind === 'user') {
    const user = detail.user;
    return (
      <div className="space-y-5">
        <div>
          <DetailLine label="Full Name" value={user.fullName} />
          <DetailLine label="Email" value={user.email} />
          <DetailLine label="Phone" value={user.phone} />
          <DetailLine label="Job Title" value={user.jobTitle} />
          <DetailLine label="Law Firm" value={user.lawFirm} />
          <DetailLine label="Attendance" value={user.attendanceType} />
          <DetailLine label="Ticket Type" value={user.ticketType} />
          <DetailLine label="Registered" value={formatDate(user.registeredAt)} />
          <DetailLine label="Total Spent" value={formatCurrency(user.totalSpent)} />
          <DetailLine label="Transactions" value={user.transactions.length} />
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-800">Purchase Timeline</h4>
          <div className="divide-y divide-slate-100 border-y border-slate-200">
            {user.transactions.length === 0 && (
              <div className="py-3 text-sm text-slate-500">
                No transactions available for this user.
              </div>
            )}
            {user.transactions.map((transaction) => (
              <div key={transaction.id} className="py-3 text-sm">
                <div className="font-medium text-slate-800">
                  {transaction.type} {transaction.ticketType} Ticket
                </div>
                <div className="text-xs text-slate-500">{formatDate(transaction.date)}</div>
                <div className="mt-0.5 font-semibold text-slate-800">
                  {formatCurrency(transaction.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (detail.kind === 'transaction') {
    const transaction = detail.transaction;
    return (
      <div>
        <DetailLine label="Transaction ID" value={transaction.id} />
        <DetailLine label="Status" value={transaction.type} />
        <DetailLine label="Ticket Type" value={transaction.ticketType} />
        <DetailLine label="Buyer" value={transaction.buyerName} />
        <DetailLine label="Buyer ID" value={transaction.buyerId ?? 'N/A'} />
        <DetailLine label="Date" value={formatDate(transaction.date)} />
        <DetailLine label="Amount" value={formatCurrency(transaction.amount)} />
      </div>
    );
  }

  if (detail.kind === 'ticketType') {
    const ticketType = detail.ticketType;
    return (
      <div className="space-y-5">
        <div>
          <DetailLine label="Ticket Type" value={ticketType.ticketType} />
          <DetailLine label="Total Count" value={ticketType.count} />
          <DetailLine label="Total Amount" value={formatCurrency(ticketType.amount)} />
          <DetailLine label="Known Purchases" value={ticketType.purchases.length} />
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-800">
            Purchase Details (Who + When)
          </h4>
          <div className="divide-y divide-slate-100 border-y border-slate-200">
            {ticketType.purchases.length === 0 && (
              <div className="py-3 text-sm text-slate-500">
                No purchase details available.
              </div>
            )}
            {ticketType.purchases.map((purchase) => (
              <div key={purchase.transactionId} className="py-3 text-sm">
                <div className="font-medium text-slate-800">{purchase.buyerName}</div>
                <div className="text-xs text-slate-500">{formatDate(purchase.date)}</div>
                <div className="mt-0.5 text-slate-700">
                  {purchase.type} - {formatCurrency(purchase.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (detail.kind === 'overviewRegistrations') {
    const registrations = detail.registrations;
    return (
      <div>
        <DetailLine label="Total Registrations" value={registrations.total} />
        <DetailLine label="VIP Tickets" value={registrations.vip} />
        <DetailLine label="Regular Tickets" value={registrations.regular} />
        <DetailLine label="In-Person" value={registrations.inPerson} />
        <DetailLine label="Virtual" value={registrations.virtual} />
        <DetailLine label="Known Profiles" value={registrations.knownProfiles} />
        <DetailLine
          label="Latest Registration"
          value={registrations.latestRegistrationAt ? formatDate(registrations.latestRegistrationAt) : 'N/A'}
        />
      </div>
    );
  }

  if (detail.kind === 'overviewInvitedGuests') {
    const invitedGuests = detail.invitedGuests;
    return (
      <div>
        <DetailLine label="Total Invited" value={invitedGuests.total} />
        <DetailLine label="Accepted" value={invitedGuests.accepted} />
        <DetailLine label="Declined" value={invitedGuests.declined} />
        <DetailLine label="Pending" value={invitedGuests.pending} />
      </div>
    );
  }

  if (detail.kind === 'inquiry') {
    const inquiry = detail.inquiry;
    return (
      <div className="space-y-6">
        <div>
          <DetailLine label="Full Name" value={inquiry.name} />
          <DetailLine label="Email" value={inquiry.email} />
          <DetailLine label="Organization" value={inquiry.organization} />
          <DetailLine label="Inquiry Type" value={inquiry.type} />
          <DetailLine label="Date Received" value={formatDate(inquiry.date)} />
        </div>

        <div className="pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 mb-2">Message</h4>
          <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 leading-relaxed whitespace-pre-wrap border border-slate-100">
            {inquiry.message}
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <button className="flex-1 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
            Reply via Email
          </button>
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
            Mark as Resolved
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DetailLine
        label="VIP"
        value={`${detail.revenueByTicketType.VIP.count} tickets, ${formatCurrency(detail.revenueByTicketType.VIP.amount)}`}
      />
      <DetailLine
        label="Regular"
        value={`${detail.revenueByTicketType.Regular.count} tickets, ${formatCurrency(detail.revenueByTicketType.Regular.amount)}`}
      />
      <DetailLine
        label="Total"
        value={`${detail.revenueByTicketType.total.count} tickets, ${formatCurrency(detail.revenueByTicketType.total.amount)}`}
      />
    </div>
  );
}

function getTitle(detail: DashboardSidebarContent): string {
  if (detail.kind === 'user') return `User Details: ${detail.user.fullName}`;
  if (detail.kind === 'transaction') return `Transaction: ${detail.transaction.id}`;
  if (detail.kind === 'ticketType') return `${detail.ticketType.ticketType} Ticket Details`;
  if (detail.kind === 'overviewRegistrations') return 'Overview: Total Registrations';
  if (detail.kind === 'overviewInvitedGuests') return 'Overview: Invited Guests';
  if (detail.kind === 'inquiry') return 'Inquiry Details';
  return 'Revenue Totals';
}

export const DetailsSidebar: React.FC<DetailsSidebarProps> = ({ detail, onClose }) => {
  useEffect(() => {
    if (!detail) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [detail, onClose]);

  return (
    <AnimatePresence>
      {detail && (
        <>
          <motion.button
            aria-label="Close details sidebar"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/30"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="fixed right-0 top-0 z-50 h-screen w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <h3 className="pr-4 text-base font-semibold text-slate-900">{getTitle(detail)}</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <SidebarContent detail={detail} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
