import { useState, useEffect, useCallback } from 'react';
import { TabOption } from '../types';

export interface TabBadges {
  [TabOption.Registrations]: number;
  [TabOption.Inquiries]: number;
}

const initialBadges: TabBadges = {
  [TabOption.Registrations]: 0,
  [TabOption.Inquiries]: 0,
};

export function useTabBadges(): TabBadges & { refetch: () => void } {
  const [badges, setBadges] = useState<TabBadges>(initialBadges);

  const fetchBadges = useCallback(async () => {
    try {
      const [approvalsRes, paymentsRes, inquiriesRes] = await Promise.all([
        fetch('/api/registrations/pending-approvals', { credentials: 'include' }),
        fetch('/api/registrations/pending-payments', { credentials: 'include' }),
        fetch('/api/inquiries', { credentials: 'include' }),
      ]);
      const [approvalsData, paymentsData, inquiriesData] = await Promise.all([
        approvalsRes.ok ? approvalsRes.json() : { total: 0, registrations: [] },
        paymentsRes.ok ? paymentsRes.json() : { registrations: [] },
        inquiriesRes.ok ? inquiriesRes.json() : [],
      ]);
      const approvalTotal = Array.isArray(approvalsData?.registrations)
        ? approvalsData.registrations.length
        : approvalsData?.total ?? 0;
      const paymentTotal = Array.isArray(paymentsData?.registrations)
        ? paymentsData.registrations.length
        : 0;
      const inquiryTotal = Array.isArray(inquiriesData) ? inquiriesData.length : 0;
      setBadges({
        [TabOption.Registrations]: approvalTotal + paymentTotal,
        [TabOption.Inquiries]: inquiryTotal,
      });
    } catch {
      setBadges(initialBadges);
    }
  }, []);

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 60000);
    return () => clearInterval(interval);
  }, [fetchBadges]);

  return { ...badges, refetch: fetchBadges };
}
