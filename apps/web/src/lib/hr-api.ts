import { getToken } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function getHrSummary(hotelId: string) {
  const res = await fetch(`${API_URL}/hr/hotels/${hotelId}/summary`, { headers: authHeaders() });
  return res.json();
}

export async function getEmployees(hotelId: string) {
  const res = await fetch(`${API_URL}/hr/hotels/${hotelId}/employees`, { headers: authHeaders() });
  return res.json();
}

export async function createEmployee(hotelId: string, data: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/hr/hotels/${hotelId}/employees`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function clockAttendance(hotelId: string, employeeId: string, action: 'IN' | 'OUT', notes?: string) {
  const res = await fetch(`${API_URL}/hr/hotels/${hotelId}/attendance/clock`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ employeeId, action, notes }),
  });
  return res.json();
}

export async function getAttendance(hotelId: string, startDate: string, endDate: string) {
  const params = new URLSearchParams({ startDate, endDate });
  const res = await fetch(`${API_URL}/hr/hotels/${hotelId}/attendance?${params}`, { headers: authHeaders() });
  return res.json();
}

export async function runPayroll(hotelId: string, periodStart: string, periodEnd: string) {
  const res = await fetch(`${API_URL}/hr/hotels/${hotelId}/payroll/run`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ periodStart, periodEnd }),
  });
  return res.json();
}

export async function getPayrollRuns(hotelId: string) {
  const res = await fetch(`${API_URL}/hr/hotels/${hotelId}/payroll`, { headers: authHeaders() });
  return res.json();
}

export async function requestLeave(hotelId: string, data: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/hr/hotels/${hotelId}/leave`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
  });
  return res.json();
}

export async function getLeaveRequests(hotelId: string) {
  const res = await fetch(`${API_URL}/hr/hotels/${hotelId}/leave`, { headers: authHeaders() });
  return res.json();
}

export async function approveLeave(hotelId: string, leaveId: string, approve = true) {
  const res = await fetch(`${API_URL}/hr/hotels/${hotelId}/leave/${leaveId}/approve`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ approve }),
  });
  return res.json();
}

export async function downloadPayslip(hotelId: string, payslipId: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/hr/hotels/${hotelId}/payroll/payslips/${payslipId}.pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payslip-${payslipId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
