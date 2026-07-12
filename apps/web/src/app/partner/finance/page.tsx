'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStoredUser, getPartnerHotels } from '@/lib/api';
import {
  getPartnerFinanceSummary,
  getPartnerSettlements,
  getSettlementDetail,
  settlePayment,
  downloadSettlementDocument,
  getBankAccounts,
  addBankAccount,
} from '@/lib/finance-api';
import { useCurrency } from '@/lib/currency';
import { PartnerNav } from '@/components/PartnerNav';
import { SETTLEMENT_TAX_DISCLAIMER } from '@estays/shared';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-orange-100 text-orange-700',
  SETTLED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-700',
};

export default function PartnerFinancePage() {
  const router = useRouter();
  const { format } = useCurrency();
  const [hotels, setHotels] = useState<Record<string, unknown>[]>([]);
  const [hotelId, setHotelId] = useState('');
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [settlements, setSettlements] = useState<Record<string, unknown>[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState<'overview' | 'pending' | 'history' | 'detail'>('overview');
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [bankAccounts, setBankAccounts] = useState<Record<string, unknown>[]>([]);
  const [bankForm, setBankForm] = useState({ bankName: '', accountName: '', accountNumber: '', ifscCode: '', isPrimary: true });

  useEffect(() => {
    const user = getStoredUser() as { roles?: string[] } | null;
    if (!user?.roles?.some((r) => ['PARTNER', 'RECEPTIONIST', 'SUPER_ADMIN', 'ADMIN'].includes(r))) {
      router.push('/login');
      return;
    }
    getPartnerHotels().then((res) => {
      if (res.success && res.data) {
        const list = res.data as Record<string, unknown>[];
        setHotels(list);
        if (list[0]) setHotelId(list[0].id as string);
      }
      setLoading(false);
    });
  }, [router]);

  const load = async (id: string) => {
    const [sumRes, stlRes, bankRes] = await Promise.all([
      getPartnerFinanceSummary(id),
      getPartnerSettlements(id),
      getBankAccounts(id),
    ]);
    if (sumRes.success) setSummary(sumRes.data as Record<string, unknown>);
    if (stlRes.success) setSettlements((stlRes.data as Record<string, unknown>[]) || []);
    if (bankRes.success) setBankAccounts((bankRes.data as Record<string, unknown>[]) || []);
  };

  useEffect(() => {
    if (hotelId) load(hotelId);
  }, [hotelId]);

  const openDetail = async (settlementId: string) => {
    const res = await getSettlementDetail(hotelId, settlementId);
    if (res.success) {
      setSelected(res.data as Record<string, unknown>);
      setTab('detail');
    }
  };

  const handleSettle = async () => {
    if (!selected) return;
    if (!confirm('Confirm settlement? This will finalize the statement and generate receipts.')) return;
    setSettling(true);
    setError('');
    const res = await settlePayment(hotelId, selected.id as string);
    if (!res.success) {
      setError(res.error?.message || 'Settlement failed');
      setSettling(false);
      return;
    }
    setMsg('Settlement completed successfully. Receipt emailed.');
    setSelected(res.data as Record<string, unknown>);
    await load(hotelId);
    setSettling(false);
  };

  const pending = settlements.filter((s) => ['PENDING', 'ACCEPTED', 'PROCESSING'].includes(s.status as string));
  const completed = settlements.filter((s) => ['SETTLED', 'COMPLETED'].includes(s.status as string));

  if (loading) return <div className="p-8 text-center text-navy/50">Loading finance...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PartnerNav />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Finance</h1>
          <p className="text-sm text-navy/50">Earnings, settlements, commission reports & invoices</p>
        </div>
        {hotels.length > 1 && (
          <select value={hotelId} onChange={(e) => setHotelId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {hotels.map((h) => (
              <option key={h.id as string} value={h.id as string}>{h.name as string}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['overview', 'pending', 'history'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setSelected(null); }}
            className={`px-4 py-2 text-sm rounded-lg capitalize ${tab === t ? 'bg-navy text-white' : 'bg-white border text-navy/70'}`}>
            {t === 'pending' ? 'Pending Settlements' : t === 'history' ? 'Settlement History' : "Today's Earnings"}
          </button>
        ))}
        <Link href="/partner" className="px-4 py-2 text-sm text-gold hover:underline ml-auto">← Properties</Link>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
      {msg && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg">{msg}</div>}

      {tab === 'overview' && summary && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Today's Earnings", value: format(summary.todayEarnings as number) },
            { label: "Today's Bookings", value: String(summary.todayBookings) },
            { label: 'Pending Settlements', value: String(summary.pendingCount) },
            { label: 'Unsettled Bookings', value: String(summary.unsettledBookings) },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-xl border border-gold/10 p-5">
              <p className="text-xs text-navy/50 uppercase tracking-wide">{c.label}</p>
              <p className="text-2xl font-bold text-navy mt-1">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'overview' && (
        <div className="bg-white rounded-xl border border-gold/10 p-5 mb-8">
          <h3 className="font-semibold text-navy mb-3">Bank Account for Payouts</h3>
          {bankAccounts.map((b) => (
            <p key={b.id as string} className="text-sm text-navy/70 mb-1">
              {b.bankName as string} · {b.accountName as string} · ****{(b.accountNumber as string).slice(-4)}
              {b.isPrimary ? ' (Primary)' : ''}
            </p>
          ))}
          <div className="grid sm:grid-cols-2 gap-2 mt-4">
            <input placeholder="Bank name" value={bankForm.bankName} onChange={(e) => setBankForm((p) => ({ ...p, bankName: e.target.value }))} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Account holder name" value={bankForm.accountName} onChange={(e) => setBankForm((p) => ({ ...p, accountName: e.target.value }))} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Account number" value={bankForm.accountNumber} onChange={(e) => setBankForm((p) => ({ ...p, accountNumber: e.target.value }))} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="IFSC code" value={bankForm.ifscCode} onChange={(e) => setBankForm((p) => ({ ...p, ifscCode: e.target.value }))} className="border rounded px-3 py-2 text-sm" />
          </div>
          <button onClick={async () => {
            const res = await addBankAccount(hotelId, bankForm);
            setMsg(res.success ? 'Bank account saved' : res.error?.message || 'Failed');
            if (res.success) load(hotelId);
          }} className="mt-3 px-4 py-2 bg-navy text-white text-sm rounded-lg">Save Bank Account</button>
        </div>
      )}

      {(tab === 'pending' || tab === 'overview') && (
        <div className="bg-white rounded-xl border border-gold/10 overflow-hidden mb-8">
          <div className="px-5 py-3 border-b border-gold/10 font-semibold text-navy">Pending Settlements</div>
          {pending.length === 0 ? (
            <p className="p-8 text-center text-navy/40 text-sm">No pending settlements</p>
          ) : (
            <div className="divide-y divide-gold/10">
              {pending.map((s) => (
                <button key={s.id as string} onClick={() => openDetail(s.id as string)}
                  className="w-full text-left px-5 py-4 hover:bg-sand/50 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-navy">{s.statementNumber as string}</p>
                    <p className="text-sm text-navy/50">{String(s.settlementDate).slice(0, 10)} · {s.bookingCount as number} bookings</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-navy">{format(s.netSettlement as number)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status as string] || ''}`}>{s.status as string}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(tab === 'history' || tab === 'overview') && (
        <div className="bg-white rounded-xl border border-gold/10 overflow-hidden">
          <div className="px-5 py-3 border-b border-gold/10 font-semibold text-navy">Completed Settlements</div>
          {completed.length === 0 ? (
            <p className="p-8 text-center text-navy/40 text-sm">No completed settlements yet</p>
          ) : (
            <div className="divide-y divide-gold/10">
              {completed.map((s) => (
                <button key={s.id as string} onClick={() => openDetail(s.id as string)}
                  className="w-full text-left px-5 py-4 hover:bg-sand/50 flex justify-between">
                  <span className="font-medium text-navy">{s.statementNumber as string}</span>
                  <span className="text-green-700 font-semibold">{format(s.netSettlement as number)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'detail' && selected && (
        <div className="bg-white rounded-xl border border-gold/10 p-6">
          <button onClick={() => setTab('pending')} className="text-sm text-gold mb-4">← Back</button>
          <h2 className="font-display text-xl font-bold text-navy mb-1">{selected.statementNumber as string}</h2>
          <p className="text-sm text-navy/50 mb-6">
            {String(selected.settlementDate).slice(0, 10)} · Status: <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[selected.status as string]}`}>{selected.status as string}</span>
          </p>

          <div className="grid sm:grid-cols-2 gap-3 text-sm mb-6">
            <p>Paid Online: <strong>{format(selected.paidOnlineTotal as number)}</strong></p>
            <p>Pay At Hotel: <strong>{format(selected.payAtHotelTotal as number)}</strong></p>
            <p>Commission: <strong>{format(selected.commissionTotal as number)}</strong></p>
            <p>
              Tax (informational): <strong>{format(selected.taxTotal as number)}</strong>
              <span className="block text-xs text-navy/45 mt-0.5">{SETTLEMENT_TAX_DISCLAIMER}</span>
            </p>
            <p>Net Settlement: <strong className="text-coral">{format(selected.netSettlement as number)}</strong></p>
            <p>Opening Balance: {format(selected.openingBalance as number)}</p>
            <p>Closing Balance: {format(selected.closingBalance as number)}</p>
          </div>

          {((selected.items as Record<string, unknown>[]) || []).length > 0 && (
            <table className="w-full text-sm mb-6">
              <thead><tr className="text-left text-navy/50 border-b"><th className="py-2">Type</th><th>Description</th><th>Gross</th><th>Comm.</th><th>Tax</th><th>Net</th></tr></thead>
              <tbody>
                {((selected.items as Record<string, unknown>[]) || []).map((i) => (
                  <tr key={i.id as string} className="border-b border-gold/10">
                    <td className="py-2">{i.entryType as string}</td>
                    <td>{i.description as string}</td>
                    <td>{format(i.grossAmount as number)}</td>
                    <td>{format(i.commission as number)}</td>
                    <td>{format((i.taxAmount as number) ?? 0)}</td>
                    <td>{format(i.netAmount as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex flex-wrap gap-3">
            {['STATEMENT', 'RECEIPT', 'CSV'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  downloadSettlementDocument(
                    hotelId,
                    selected.id as string,
                    type,
                    `${selected.statementNumber as string}-${type.toLowerCase()}.${type === 'CSV' ? 'csv' : 'pdf'}`
                  ).catch(() => setError('Download failed — try again'))
                }
                className="px-4 py-2 text-sm border border-gold/30 rounded-lg hover:bg-sand"
              >
                Download {type} {type !== 'CSV' ? 'PDF' : ''}
              </button>
            ))}
            {['PENDING', 'ACCEPTED'].includes(selected.status as string) && (
              <button onClick={handleSettle} disabled={settling}
                className="px-6 py-3 bg-coral text-white font-semibold rounded-xl hover:bg-coral/90 disabled:opacity-50 text-lg">
                {settling ? 'Processing...' : 'SETTLE PAYMENT'}
              </button>
            )}
          </div>
          {selected.transactionRef && (
            <p className="mt-4 text-sm text-navy/50">Transaction Ref: {selected.transactionRef as string}</p>
          )}
        </div>
      )}
    </div>
  );
}
