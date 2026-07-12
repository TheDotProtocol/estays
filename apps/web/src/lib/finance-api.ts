import { getToken } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function getPartnerFinanceSummary(hotelId: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/finance/partner/hotels/${hotelId}/finance/summary`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

export async function getPartnerSettlements(hotelId: string, page = 1, status?: string) {
  const token = getToken();
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (status) params.set('status', status);
  const res = await fetch(`${API_URL}/finance/partner/hotels/${hotelId}/finance/settlements?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

export async function getSettlementDetail(hotelId: string, settlementId: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/finance/partner/hotels/${hotelId}/finance/settlements/${settlementId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

export async function settlePayment(hotelId: string, settlementId: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/finance/partner/hotels/${hotelId}/finance/settlements/${settlementId}/settle`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
  });
  return res.json();
}

export async function getAdminBillingDashboard() {
  const token = getToken();
  const res = await fetch(`${API_URL}/finance/admin/billing/dashboard`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

export async function getAdminSettlements(page = 1, filters?: Record<string, string>) {
  const token = getToken();
  const params = new URLSearchParams({ page: String(page), limit: '20', ...filters });
  const res = await fetch(`${API_URL}/finance/admin/billing/settlements?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

export async function generateWeeklySettlements(hotelId?: string, weekEnd?: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/finance/admin/billing/settlements/generate-weekly`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hotelId, weekEnd }),
  });
  return res.json();
}

export async function getBillingConfig() {
  const token = getToken();
  const res = await fetch(`${API_URL}/finance/admin/billing/config`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

export async function updateBillingConfig(data: {
  settlementNotifyEmails: string[];
  billingFromEmail: string;
  billingReplyToEmail?: string;
  companyLegalName: string;
}) {
  const token = getToken();
  const res = await fetch(`${API_URL}/finance/admin/billing/config`, {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function downloadSettlementDocument(
  hotelId: string,
  settlementId: string,
  type: string,
  fileName: string
) {
  const token = getToken();
  const res = await fetch(`${API_URL}/finance/partner/hotels/${hotelId}/finance/settlements/${settlementId}/documents/${type}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function generateDailySettlements(hotelId?: string, date?: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/finance/admin/billing/settlements/generate-daily`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hotelId, date }),
  });
  return res.json();
}

export function settlementDocumentUrl(hotelId: string, settlementId: string, type: string) {
  return `${API_URL}/finance/partner/hotels/${hotelId}/finance/settlements/${settlementId}/documents/${type}`;
}

export async function addManualAdjustment(hotelId: string, entryType: string, description: string, amount: number) {
  const token = getToken();
  const res = await fetch(`${API_URL}/finance/admin/billing/adjustments`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hotelId, entryType, description, amount }),
  });
  return res.json();
}

export async function getBankAccounts(hotelId: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/finance/partner/hotels/${hotelId}/bank-accounts`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

export async function addBankAccount(hotelId: string, data: Record<string, unknown>) {
  const token = getToken();
  const res = await fetch(`${API_URL}/finance/partner/hotels/${hotelId}/bank-accounts`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}
