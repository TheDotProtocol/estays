'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getStoredUser,
  getAdminDashboard,
  getPendingHotels,
  approveHotel,
  getPendingPartners,
  updatePartnerStatus,
  getAdminUsers,
  getAdminPartners,
  getAdminTransactions,
  getAdminPerformance,
  getAdminProfitLoss,
  getAdminComplaints,
  getAdminFeedback,
  updateComplaintStatus,
  refundPayment,
} from '@/lib/api';
import { getAdminBillingDashboard, getAdminSettlements, generateDailySettlements, generateWeeklySettlements, getBillingConfig, updateBillingConfig, addManualAdjustment } from '@/lib/finance-api';
import { COMPANY } from '@/lib/company';

type Tab = 'overview' | 'users' | 'partners' | 'transactions' | 'performance' | 'profit-loss' | 'complaints' | 'feedback' | 'approvals' | 'billing';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
  CAPTURED: 'bg-green-100 text-green-700',
  AUTHORIZED: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  PENDING_KYC: 'bg-yellow-100 text-yellow-700',
  PENDING_APPROVAL: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') || 'overview') as Tab;

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [partners, setPartners] = useState<Record<string, unknown>[]>([]);
  const [pendingPartners, setPendingPartners] = useState<Record<string, unknown>[]>([]);
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [performance, setPerformance] = useState<Record<string, unknown>[]>([]);
  const [profitLoss, setProfitLoss] = useState<Record<string, unknown> | null>(null);
  const [complaints, setComplaints] = useState<{ complaints: Record<string, unknown>[]; byProperty: Record<string, unknown>[]; summary: Record<string, unknown> } | null>(null);
  const [feedback, setFeedback] = useState<{ reviews: Record<string, unknown>[]; byProperty: Record<string, unknown>[]; summary: Record<string, unknown> } | null>(null);
  const [pendingHotels, setPendingHotels] = useState<Record<string, unknown>[]>([]);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [billingStats, setBillingStats] = useState<Record<string, unknown> | null>(null);
  const [billingSettlements, setBillingSettlements] = useState<Record<string, unknown>[]>([]);
  const [billingMsg, setBillingMsg] = useState('');
  const [billingConfig, setBillingConfig] = useState<{
    settlementNotifyEmails: string[];
    billingFromEmail: string;
    billingReplyToEmail: string;
    companyLegalName: string;
  }>({
    settlementNotifyEmails: [],
    billingFromEmail: COMPANY.emails.billing,
    billingReplyToEmail: '',
    companyLegalName: COMPANY.name,
  });
  const [configEmails, setConfigEmails] = useState('');
  const [configSaving, setConfigSaving] = useState(false);

  const load = useCallback(async () => {
    const [dash, usersRes, partnersRes, pendingRes, txRes, perfRes, plRes, compRes, feedRes, hotelsRes] = await Promise.all([
      getAdminDashboard(),
      getAdminUsers(),
      getAdminPartners(),
      getPendingPartners(),
      getAdminTransactions(),
      getAdminPerformance(),
      getAdminProfitLoss(),
      getAdminComplaints(),
      getAdminFeedback(),
      getPendingHotels(),
    ]);
    if (dash.success) setStats(dash.data as Record<string, unknown>);
    if (usersRes.success) setUsers((usersRes.data as Record<string, unknown>[]) || []);
    if (partnersRes.success) setPartners((partnersRes.data as Record<string, unknown>[]) || []);
    if (pendingRes.success) setPendingPartners((pendingRes.data as Record<string, unknown>[]) || []);
    if (txRes.success) setTransactions((txRes.data as Record<string, unknown>[]) || []);
    if (perfRes.success) setPerformance((perfRes.data as Record<string, unknown>[]) || []);
    if (plRes.success) setProfitLoss(plRes.data as Record<string, unknown>);
    if (compRes.success) setComplaints(compRes.data as typeof complaints);
    if (feedRes.success) setFeedback(feedRes.data as typeof feedback);
    if (hotelsRes.success) setPendingHotels((hotelsRes.data as Record<string, unknown>[]) || []);
  }, []);

  useEffect(() => {
    const user = getStoredUser();
    if (!user?.roles?.some((r: string) => ['SUPER_ADMIN', 'ADMIN'].includes(r))) {
      router.push('/login');
      return;
    }
    load().then(() => setLoading(false));
  }, [router, load]);

  useEffect(() => {
    if (tab !== 'billing') return;
    Promise.all([getAdminBillingDashboard(), getAdminSettlements(), getBillingConfig()]).then(([dash, stl, cfg]) => {
      if (dash.success) setBillingStats(dash.data as Record<string, unknown>);
      if (stl.success) setBillingSettlements((stl.data as Record<string, unknown>[]) || []);
      if (cfg.success && cfg.data) {
        const c = cfg.data as Record<string, unknown>;
        setBillingConfig({
          settlementNotifyEmails: (c.settlementNotifyEmails as string[]) || [],
          billingFromEmail: (c.billingFromEmail as string) || COMPANY.emails.billing,
          billingReplyToEmail: (c.billingReplyToEmail as string) || '',
          companyLegalName: (c.companyLegalName as string) || COMPANY.name,
        });
        setConfigEmails(((c.settlementNotifyEmails as string[]) || []).join('\n'));
      }
    });
  }, [tab]);

  const handleGenerateWeekly = async () => {
    setBillingMsg('');
    const res = await generateWeeklySettlements();
    if (res.success) {
      setBillingMsg(`Generated ${(res.data as { generated?: number })?.generated ?? 0} weekly settlement(s)`);
      const [dash, stl] = await Promise.all([getAdminBillingDashboard(), getAdminSettlements()]);
      if (dash.success) setBillingStats(dash.data as Record<string, unknown>);
      if (stl.success) setBillingSettlements((stl.data as Record<string, unknown>[]) || []);
    } else {
      setBillingMsg(res.error?.message || 'Generation failed');
    }
  };

  const handleSaveBillingConfig = async () => {
    setConfigSaving(true);
    setBillingMsg('');
    const emails = configEmails.split(/[\n,]+/).map((e) => e.trim()).filter(Boolean);
    const res = await updateBillingConfig({
      settlementNotifyEmails: emails,
      billingFromEmail: billingConfig.billingFromEmail,
      billingReplyToEmail: billingConfig.billingReplyToEmail || undefined,
      companyLegalName: billingConfig.companyLegalName,
    });
    if (res.success) {
      setBillingMsg('Billing email settings saved.');
      setBillingConfig((prev) => ({ ...prev, settlementNotifyEmails: emails }));
    } else {
      setBillingMsg(res.error?.message || 'Failed to save config');
    }
    setConfigSaving(false);
  };

  const handleGenerateDaily = async () => {
    setBillingMsg('');
    const res = await generateDailySettlements();
    if (res.success) {
      setBillingMsg(`Generated ${(res.data as { generated?: number })?.generated ?? 0} settlement(s)`);
      const [dash, stl] = await Promise.all([getAdminBillingDashboard(), getAdminSettlements()]);
      if (dash.success) setBillingStats(dash.data as Record<string, unknown>);
      if (stl.success) setBillingSettlements((stl.data as Record<string, unknown>[]) || []);
    } else {
      setBillingMsg(res.error?.message || 'Generation failed');
    }
  };

  const handlePartnerAction = async (userId: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(userId);
    await updatePartnerStatus(userId, status);
    await load();
    setActionLoading(null);
  };

  const handleHotelAction = async (id: string, status: string) => {
    setActionLoading(id);
    await approveHotel(id, status);
    await load();
    setActionLoading(null);
  };

  const handleComplaintAction = async (id: string, status: string) => {
    setActionLoading(id);
    await updateComplaintStatus(id, status);
    await load();
    setActionLoading(null);
  };

  if (loading) {
    return <div className="text-center py-20 text-navy/50">Loading admin portal...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-navy capitalize">
          {tab === 'profit-loss' ? 'Profit & Loss' : tab.replace(/-/g, ' ')}
        </h1>
        <p className="text-sm text-navy/50">E Stays Hotels LLC — Platform Administration</p>
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <Link href="/admin/analytics" className="inline-block px-4 py-2 bg-navy text-white text-sm rounded-lg hover:bg-navy-light">
            Platform Analytics (ADR, RevPAR, CSV) →
          </Link>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total Revenue', value: fmt(stats?.totalRevenue as number || 0), color: 'bg-navy' },
              { label: 'Platform Commission', value: fmt(stats?.platformCommission as number || 0), color: 'bg-coral' },
              { label: 'Transactions', value: stats?.totalTransactions, color: 'bg-green-600' },
              { label: 'Total Users', value: stats?.totalUsers, color: 'bg-gold' },
              { label: 'Open Complaints', value: stats?.openComplaints, color: 'bg-red-500' },
              { label: 'Active Hotels', value: stats?.activeHotels, color: 'bg-navy-light' },
              { label: 'Total Bookings', value: stats?.totalBookings, color: 'bg-blue-600' },
              { label: 'Partners', value: stats?.totalPartners, color: 'bg-purple-600' },
              { label: 'Pending Hotels', value: stats?.pendingApprovals, color: 'bg-orange-500' },
              { label: 'Total Properties', value: stats?.totalHotels, color: 'bg-gray-600' },
            ].map((s) => (
              <div key={s.label} className={`${s.color} text-white rounded-xl p-4`}>
                <p className="text-[11px] opacity-80">{s.label}</p>
                <p className="text-xl font-bold mt-1">{s.value as string | number}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gold/10 p-5">
              <h3 className="font-semibold text-navy mb-3">Top Properties by Revenue</h3>
              {performance.slice(0, 5).map((p) => (
                <div key={p.hotelId as string} className="flex justify-between py-2 border-b border-gold/5 text-sm">
                  <span className="text-navy truncate mr-2">{p.name as string}</span>
                  <span className="font-semibold text-navy shrink-0">{fmt(p.revenue as number)}</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gold/10 p-5">
              <h3 className="font-semibold text-navy mb-3">P&L Snapshot</h3>
              {profitLoss && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-navy/60">Gross Revenue</span><span className="font-semibold">{fmt(profitLoss.grossRevenue as number)}</span></div>
                  <div className="flex justify-between"><span className="text-navy/60">Refunds</span><span className="text-red-500">-{fmt(profitLoss.totalRefunds as number)}</span></div>
                  <div className="flex justify-between border-t pt-2"><span className="text-navy/60">Net Revenue</span><span className="font-semibold">{fmt(profitLoss.netRevenue as number)}</span></div>
                  <div className="flex justify-between"><span className="text-navy/60">Platform ({((profitLoss.commissionRate as number) * 100)}%)</span><span className="text-coral font-semibold">{fmt(profitLoss.platformCommission as number)}</span></div>
                  <div className="flex justify-between"><span className="text-navy/60">Partner Payouts</span><span className="text-green-600 font-semibold">{fmt(profitLoss.partnerPayouts as number)}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* USERS */}
      {tab === 'users' && (
        <div className="bg-white rounded-xl border border-gold/10 overflow-hidden">
          <div className="px-5 py-3 border-b border-gold/10 flex justify-between">
            <h3 className="font-semibold text-navy">All Users ({users.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sand text-navy/60 text-xs">
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Roles</th>
                  <th className="text-left px-4 py-2">Tier</th>
                  <th className="text-left px-4 py-2">Bookings</th>
                  <th className="text-left px-4 py-2">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/5">
                {users.map((u) => (
                  <tr key={u.id as string} className="hover:bg-sand/50">
                    <td className="px-4 py-3 font-medium text-navy">{u.firstName as string} {u.lastName as string}</td>
                    <td className="px-4 py-3 text-navy/60">{u.email as string}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(u.roles as string[])?.map((r) => (
                          <span key={r} className="text-[10px] px-1.5 py-0.5 bg-navy/10 text-navy rounded">{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gold text-xs">{u.loyaltyTier as string}</td>
                    <td className="px-4 py-3">{u.bookingCount as number}</td>
                    <td className="px-4 py-3 text-navy/50 text-xs">{fmtDate(u.createdAt as string)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PARTNERS */}
      {tab === 'partners' && (
        <div className="space-y-4">
          {pendingPartners.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm font-medium text-yellow-800">{pendingPartners.length} partner(s) awaiting KYC review — see Approvals tab</p>
            </div>
          )}
          {partners.map((p) => (
            <div key={p.id as string} className="bg-white rounded-xl border border-gold/10 p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-navy">{p.firstName as string} {p.lastName as string}</h3>
                  <p className="text-sm text-navy/50">{p.email as string} · {p.companyName as string}</p>
                  <p className="text-xs text-navy/40 mt-1">{p.companyAddress as string}</p>
                </div>
                <div className="text-right">
                  <Badge status={p.partnerStatus as string || 'APPROVED'} />
                  <p className="text-xs text-navy/50 mt-1">{p.propertyCount as number} propert{p.propertyCount === 1 ? 'y' : 'ies'}</p>
                </div>
              </div>
              {(p.properties as Record<string, unknown>[])?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(p.properties as Record<string, unknown>[]).map((h) => (
                    <span key={h.id as string} className="text-xs px-2 py-1 bg-sand rounded text-navy/70">
                      {h.name as string} · {h.city as string}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TRANSACTIONS */}
      {tab === 'transactions' && (
        <div className="bg-white rounded-xl border border-gold/10 overflow-hidden">
          <div className="px-5 py-3 border-b border-gold/10">
            <h3 className="font-semibold text-navy">Payment Transactions ({transactions.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sand text-navy/60 text-xs">
                <tr>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Booking</th>
                  <th className="text-left px-4 py-2">Property</th>
                  <th className="text-left px-4 py-2">Guest / Payer</th>
                  <th className="text-left px-4 py-2">Method</th>
                  <th className="text-left px-4 py-2">Amount</th>
                  <th className="text-left px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/5">
                {transactions.map((t) => {
                  const hotel = t.hotel as Record<string, unknown>;
                  const guest = t.guest as Record<string, unknown>;
                  return (
                    <tr key={t.id as string} className="hover:bg-sand/50">
                      <td className="px-4 py-3 text-xs text-navy/50">{fmtDate(t.createdAt as string)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{t.bookingNumber as string}</td>
                      <td className="px-4 py-3">
                        <div className="text-navy text-xs font-medium">{hotel?.name as string}</div>
                        <div className="text-navy/40 text-[10px]">{hotel?.city as string}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>{t.payerName as string || `${guest?.firstName} ${guest?.lastName}`}</div>
                        <div className="text-navy/40">{t.payerEmail as string}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">{(t.method as string)?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 font-semibold">{fmt(t.amount as number)}</td>
                      <td className="px-4 py-3"><Badge status={t.status as string} /></td>
                      <td className="px-4 py-3">
                        {t.status === 'CAPTURED' && (
                          <button onClick={async () => {
                            const res = await refundPayment(t.id as string);
                            if (res.success) load();
                          }} className="text-xs text-red-600 hover:underline">Refund</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PERFORMANCE */}
      {tab === 'performance' && (
        <div className="bg-white rounded-xl border border-gold/10 overflow-hidden">
          <div className="px-5 py-3 border-b border-gold/10">
            <h3 className="font-semibold text-navy">Property Performance ({performance.length} properties)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sand text-navy/60 text-xs">
                <tr>
                  <th className="text-left px-4 py-2">Property</th>
                  <th className="text-left px-4 py-2">Location</th>
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-right px-4 py-2">Bookings</th>
                  <th className="text-right px-4 py-2">Revenue</th>
                  <th className="text-right px-4 py-2">Rating</th>
                  <th className="text-right px-4 py-2">Reviews</th>
                  <th className="text-right px-4 py-2">Complaints</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/5">
                {performance.map((p) => (
                  <tr key={p.hotelId as string} className="hover:bg-sand/50">
                    <td className="px-4 py-3 font-medium text-navy">{p.name as string}</td>
                    <td className="px-4 py-3 text-navy/60 text-xs">{p.city as string}, {p.country as string}</td>
                    <td className="px-4 py-3 text-xs">{p.propertyType as string} · {p.starRating as number}★</td>
                    <td className="px-4 py-3 text-right">{p.confirmedBookings as number}/{p.totalBookings as number}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(p.revenue as number)}</td>
                    <td className="px-4 py-3 text-right text-gold">{p.avgRating ? `${p.avgRating} ★` : '—'}</td>
                    <td className="px-4 py-3 text-right">{p.reviewCount as number}</td>
                    <td className="px-4 py-3 text-right">
                      {(p.openComplaints as number) > 0 ? (
                        <span className="text-red-500 font-medium">{p.openComplaints as number} open</span>
                      ) : (
                        <span className="text-navy/40">{p.totalComplaints as number}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROFIT & LOSS */}
      {tab === 'profit-loss' && profitLoss && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Gross Revenue', value: profitLoss.grossRevenue as number, color: 'text-navy' },
              { label: 'Refunds', value: -(profitLoss.totalRefunds as number), color: 'text-red-500' },
              { label: 'Net Revenue', value: profitLoss.netRevenue as number, color: 'text-navy' },
              { label: `Platform Share (${((profitLoss.commissionRate as number) * 100)}%)`, value: profitLoss.platformCommission as number, color: 'text-coral' },
              { label: 'Partner Payouts', value: profitLoss.partnerPayouts as number, color: 'text-green-600' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gold/10 p-4 text-center">
                <p className="text-xs text-navy/50">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${s.color}`}>{fmt(Math.abs(s.value))}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gold/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-gold/10">
              <h3 className="font-semibold text-navy">P&L by Property</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-sand text-navy/60 text-xs">
                  <tr>
                    <th className="text-left px-4 py-2">Property</th>
                    <th className="text-right px-4 py-2">Gross</th>
                    <th className="text-right px-4 py-2">Refunds</th>
                    <th className="text-right px-4 py-2">Net</th>
                    <th className="text-right px-4 py-2">Platform</th>
                    <th className="text-right px-4 py-2">Partner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/5">
                  {((profitLoss.byProperty as Record<string, unknown>[]) || []).map((p) => (
                    <tr key={p.hotelId as string}>
                      <td className="px-4 py-3 font-medium text-navy">{p.name as string}</td>
                      <td className="px-4 py-3 text-right">{fmt(p.gross as number)}</td>
                      <td className="px-4 py-3 text-right text-red-500">{fmt(p.refunds as number)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmt(p.net as number)}</td>
                      <td className="px-4 py-3 text-right text-coral">{fmt(p.platformShare as number)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{fmt(p.partnerShare as number)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {((profitLoss.monthly as Record<string, unknown>[]) || []).length > 0 && (
            <div className="bg-white rounded-xl border border-gold/10 p-5">
              <h3 className="font-semibold text-navy mb-3">Monthly Trend</h3>
              <div className="space-y-2">
                {((profitLoss.monthly as Record<string, unknown>[]) || []).map((m) => (
                  <div key={m.month as string} className="flex items-center gap-3 text-sm">
                    <span className="w-20 text-navy/50 text-xs">{m.month as string}</span>
                    <div className="flex-1 bg-sand rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-navy h-full rounded-full"
                        style={{ width: `${Math.min(100, ((m.net as number) / (profitLoss.netRevenue as number)) * 100 * 3)}%` }}
                      />
                    </div>
                    <span className="font-semibold text-navy w-24 text-right">{fmt(m.net as number)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* COMPLAINTS */}
      {tab === 'complaints' && complaints && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total', value: complaints.summary.total },
              { label: 'Open', value: complaints.summary.open },
              { label: 'Resolved', value: complaints.summary.resolved },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gold/10 p-4 text-center">
                <p className="text-xs text-navy/50">{s.label}</p>
                <p className="text-2xl font-bold text-navy">{s.value as number}</p>
              </div>
            ))}
          </div>

          {complaints.byProperty.map((prop) => (
            <div key={prop.hotelId as string} className="bg-white rounded-xl border border-gold/10 overflow-hidden">
              <button
                onClick={() => setExpandedProperty(expandedProperty === prop.hotelId ? null : prop.hotelId as string)}
                className="w-full px-5 py-4 flex justify-between items-center hover:bg-sand/50 text-left"
              >
                <div>
                  <h3 className="font-semibold text-navy">{prop.name as string}</h3>
                  <p className="text-xs text-navy/50">{prop.city as string}, {prop.country as string}</p>
                </div>
                <div className="flex items-center gap-3">
                  {(prop.open as number) > 0 && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">{prop.open as number} open</span>}
                  <span className="text-sm text-navy/50">{(prop.complaints as unknown[]).length} total</span>
                  <span className="text-navy/30">{expandedProperty === prop.hotelId ? '▲' : '▼'}</span>
                </div>
              </button>
              {expandedProperty === prop.hotelId && (
                <div className="border-t border-gold/10 divide-y divide-gold/5">
                  {(prop.complaints as Record<string, unknown>[]).map((c) => (
                    <div key={c.id as string} className="px-5 py-4">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-navy text-sm">{c.subject as string}</span>
                            <Badge status={c.status as string} />
                            <span className="text-[10px] text-navy/40">{c.category as string}</span>
                          </div>
                          <p className="text-xs text-navy/50 mt-1">{c.guestName as string} · {fmtDate(c.createdAt as string)}</p>
                          <p className="text-sm text-navy/70 mt-2">{c.description as string}</p>
                          {c.resolution ? <p className="text-xs text-green-600 mt-2 bg-green-50 p-2 rounded">Resolution: {c.resolution as string}</p> : null}
                        </div>
                        {['OPEN', 'IN_PROGRESS'].includes(c.status as string) && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => handleComplaintAction(c.id as string, 'IN_PROGRESS')} disabled={actionLoading === c.id}
                              className="text-[10px] px-2 py-1 bg-yellow-100 text-yellow-700 rounded disabled:opacity-50">Progress</button>
                            <button onClick={() => handleComplaintAction(c.id as string, 'RESOLVED')} disabled={actionLoading === c.id}
                              className="text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded disabled:opacity-50">Resolve</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FEEDBACK */}
      {tab === 'feedback' && feedback && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gold/10 p-4 flex items-center gap-6">
            <div>
              <p className="text-xs text-navy/50">Platform Avg Rating</p>
              <p className="text-3xl font-bold text-gold">{feedback.summary.avgRating as number} ★</p>
            </div>
            <div>
              <p className="text-xs text-navy/50">Total Reviews</p>
              <p className="text-3xl font-bold text-navy">{feedback.summary.total as number}</p>
            </div>
          </div>

          {feedback.byProperty.map((prop) => (
            <div key={prop.hotelId as string} className="bg-white rounded-xl border border-gold/10 overflow-hidden">
              <button
                onClick={() => setExpandedProperty(expandedProperty === `fb-${prop.hotelId}` ? null : `fb-${prop.hotelId}`)}
                className="w-full px-5 py-4 flex justify-between items-center hover:bg-sand/50 text-left"
              >
                <div>
                  <h3 className="font-semibold text-navy">{prop.name as string}</h3>
                  <p className="text-xs text-navy/50">{prop.city as string}, {prop.country as string} · {prop.starRating as number}★</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gold font-semibold">{prop.avgRating as number} ★</span>
                  <span className="text-sm text-navy/50">{(prop.reviews as unknown[]).length} reviews</span>
                  <span className="text-navy/30">{expandedProperty === `fb-${prop.hotelId}` ? '▲' : '▼'}</span>
                </div>
              </button>
              {expandedProperty === `fb-${prop.hotelId}` && (
                <div className="border-t border-gold/10 divide-y divide-gold/5">
                  {(prop.reviews as Record<string, unknown>[]).map((r) => (
                    <div key={r.id as string} className="px-5 py-4">
                      <div className="flex justify-between">
                        <span className="font-medium text-navy text-sm">{r.guestName as string}</span>
                        <span className="text-gold text-sm">{'★'.repeat(r.rating as number)}</span>
                      </div>
                      {r.title ? <p className="font-medium text-sm text-navy mt-1">{r.title as string}</p> : null}
                      <p className="text-sm text-navy/70 mt-1">{r.comment as string}</p>
                      {r.partnerReply ? (
                        <p className="text-xs text-navy/50 mt-2 bg-sand p-2 rounded">Partner reply: {r.partnerReply as string}</p>
                      ) : null}
                      <p className="text-[10px] text-navy/40 mt-1">{fmtDate(r.createdAt as string)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* BILLING */}
      {tab === 'billing' && (
        <div className="space-y-6">
          {billingMsg && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">{billingMsg}</div>}
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h2 className="font-display text-xl font-bold text-navy">Billing & Settlement</h2>
            <div className="flex gap-2">
              <button onClick={handleGenerateWeekly} className="px-4 py-2 bg-coral text-white text-sm rounded-lg hover:bg-coral/90">
                Generate Weekly Settlements
              </button>
              <button onClick={handleGenerateDaily} className="px-4 py-2 bg-navy text-white text-sm rounded-lg hover:bg-navy-light">
                Generate Daily (manual)
              </button>
            </div>
          </div>
          <p className="text-xs text-navy/50">Weekly settlements run automatically every Monday. Use manual credits when bank/QR payments are confirmed from EOD reports. GST/VAT is tracked per booking for reporting but is not included in settlement payout amounts until auditor guidance is finalized.</p>

          <div className="bg-white rounded-xl border border-gold/10 p-5">
            <h3 className="font-semibold text-navy mb-3">Manual Credit / Debit</h3>
            <p className="text-xs text-navy/50 mb-3">Apply when EOD bank report confirms a QR/UPI payment.</p>
            <div className="flex flex-wrap gap-2">
              <input id="adj-hotel" placeholder="Hotel ID" className="border rounded px-3 py-2 text-sm w-48" />
              <input id="adj-desc" placeholder="Description" className="border rounded px-3 py-2 text-sm flex-1 min-w-[200px]" />
              <input id="adj-amt" type="number" placeholder="Amount" className="border rounded px-3 py-2 text-sm w-28" />
              <button onClick={async () => {
                const hotelId = (document.getElementById('adj-hotel') as HTMLInputElement).value;
                const description = (document.getElementById('adj-desc') as HTMLInputElement).value;
                const amount = parseFloat((document.getElementById('adj-amt') as HTMLInputElement).value);
                const res = await addManualAdjustment(hotelId, 'CREDIT', description, amount);
                setBillingMsg(res.success ? 'Adjustment applied' : res.error?.message || 'Failed');
              }} className="px-4 py-2 bg-coral text-white text-sm rounded-lg">Apply Credit</button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gold/10 p-5">
            <h3 className="font-semibold text-navy mb-3">Settlement Email Recipients</h3>
            <p className="text-xs text-navy/50 mb-4">PDF statements, receipts, and CSV files are emailed to these addresses plus each partner&apos;s registered email after settlement completes.</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-navy/60 mb-1">Notification emails (one per line)</label>
                <textarea
                  value={configEmails}
                  onChange={(e) => setConfigEmails(e.target.value)}
                  rows={4}
                  placeholder={`${COMPANY.emails.billing}\npartner@example.com`}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-navy/60 mb-1">From email</label>
                  <input
                    value={billingConfig.billingFromEmail}
                    onChange={(e) => setBillingConfig((p) => ({ ...p, billingFromEmail: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-navy/60 mb-1">Reply-to (optional)</label>
                  <input
                    value={billingConfig.billingReplyToEmail}
                    onChange={(e) => setBillingConfig((p) => ({ ...p, billingReplyToEmail: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-navy/60 mb-1">Legal name on documents</label>
                  <input
                    value={billingConfig.companyLegalName}
                    onChange={(e) => setBillingConfig((p) => ({ ...p, companyLegalName: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <button onClick={handleSaveBillingConfig} disabled={configSaving}
              className="px-4 py-2 bg-navy text-white text-sm rounded-lg disabled:opacity-50">
              {configSaving ? 'Saving...' : 'Save Email Settings'}
            </button>
          </div>
          {billingStats && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Today's Settlements", value: billingStats.todayCount },
                { label: 'Pending', value: billingStats.pending },
                { label: 'Failed', value: billingStats.failed },
                { label: 'Daily Revenue', value: fmt(billingStats.dailyRevenue as number) },
                { label: 'Monthly Revenue', value: fmt(billingStats.monthlyRevenue as number) },
                { label: 'Commission Earned', value: fmt((billingStats.commission as { _sum?: { commissionTotal?: number } })?._sum?.commissionTotal as number || 0) },
                { label: 'Outstanding Payable', value: fmt((billingStats.outstanding as { _sum?: { netPayable?: number } })?._sum?.netPayable as number || 0) },
                { label: 'Outstanding Receivable', value: fmt((billingStats.outstanding as { _sum?: { netReceivable?: number } })?._sum?.netReceivable as number || 0) },
              ].map((c) => (
                <div key={c.label} className="bg-white rounded-xl border border-gold/10 p-4">
                  <p className="text-xs text-navy/50">{c.label}</p>
                  <p className="text-xl font-bold text-navy">{c.value as string | number}</p>
                </div>
              ))}
            </div>
          )}
          <div className="bg-white rounded-xl border border-gold/10 overflow-hidden">
            <div className="px-5 py-3 border-b font-semibold text-navy">Recent Settlements</div>
            {billingSettlements.length === 0 ? (
              <p className="p-8 text-center text-navy/40 text-sm">No settlements yet. Click Generate Daily Settlements.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-navy/50 border-b"><th className="px-5 py-2">Statement</th><th>Hotel</th><th>Date</th><th>Net</th><th>Status</th></tr></thead>
                <tbody>
                  {billingSettlements.map((s) => (
                    <tr key={s.id as string} className="border-b border-gold/10">
                      <td className="px-5 py-3 font-medium">{s.statementNumber as string}</td>
                      <td>{(s.hotel as Record<string, unknown>)?.name as string}</td>
                      <td>{String(s.settlementDate).slice(0, 10)}</td>
                      <td>{fmt(s.netSettlement as number)}</td>
                      <td><Badge status={s.status as string} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* APPROVALS */}
      {tab === 'approvals' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gold/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-gold/10">
              <h3 className="font-semibold text-navy">Partner KYC Review</h3>
            </div>
            {pendingPartners.length === 0 ? (
              <div className="p-8 text-center text-navy/40 text-sm">No partners awaiting review</div>
            ) : (
              <div className="divide-y divide-gold/10">
                {pendingPartners.map((partner) => (
                  <div key={partner.id as string} className="px-5 py-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-navy">{partner.firstName as string} {partner.lastName as string}</h4>
                        <p className="text-sm text-navy/50">{partner.email as string} · {partner.companyName as string}</p>
                        <Badge status={partner.partnerStatus as string} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handlePartnerAction(partner.id as string, 'APPROVED')}
                          disabled={actionLoading === partner.id || !((partner.kycDocuments as unknown[])?.length)}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg disabled:opacity-50">Approve</button>
                        <button onClick={() => handlePartnerAction(partner.id as string, 'REJECTED')}
                          disabled={actionLoading === partner.id}
                          className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg disabled:opacity-50">Reject</button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {((partner.kycDocuments as Record<string, unknown>[]) || []).map((doc) => (
                        <a key={doc.id as string} href={doc.url as string} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-2 py-1 bg-sand rounded hover:bg-gold/20">
                          📄 {doc.documentType as string}: {doc.originalName as string}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gold/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-gold/10">
              <h3 className="font-semibold text-navy">Pending Hotel Approvals</h3>
            </div>
            {pendingHotels.length === 0 ? (
              <div className="p-8 text-center text-navy/40 text-sm">No pending hotel approvals</div>
            ) : (
              <div className="divide-y divide-gold/10">
                {pendingHotels.map((hotel) => (
                  <div key={hotel.id as string} className="px-5 py-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-navy">{hotel.name as string}</h4>
                      <p className="text-sm text-navy/50">{hotel.city as string} — {hotel.starRating as number}★</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleHotelAction(hotel.id as string, 'ACTIVE')} disabled={actionLoading === hotel.id}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg disabled:opacity-50">Approve</button>
                      <button onClick={() => handleHotelAction(hotel.id as string, 'REJECTED')} disabled={actionLoading === hotel.id}
                        className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg disabled:opacity-50">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-navy/50">Loading admin portal...</div>}>
      <AdminContent />
    </Suspense>
  );
}
