'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, getPartnerHotels } from '@/lib/api';
import { PartnerNav } from '@/components/PartnerNav';
import {
  getHrSummary,
  getEmployees,
  createEmployee,
  clockAttendance,
  getAttendance,
  runPayroll,
  getPayrollRuns,
  requestLeave,
  getLeaveRequests,
  approveLeave,
  downloadPayslip,
} from '@/lib/hr-api';
import { useCurrency } from '@/lib/currency';

type Tab = 'overview' | 'employees' | 'attendance' | 'leave' | 'payroll';

export default function PartnerHrPage() {
  const router = useRouter();
  const { format } = useCurrency();
  const [hotels, setHotels] = useState<Record<string, unknown>[]>([]);
  const [hotelId, setHotelId] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [employees, setEmployees] = useState<Record<string, unknown>[]>([]);
  const [attendance, setAttendance] = useState<Record<string, unknown>[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<Record<string, unknown>[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', department: 'Front Desk',
    designation: 'Staff', joinDate: new Date().toISOString().slice(0, 10), basicSalary: 25000,
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  const today = new Date().toISOString().slice(0, 10);

  const loadAll = async (id: string) => {
    const [sumRes, empRes, attRes, payRes, leaveRes] = await Promise.all([
      getHrSummary(id),
      getEmployees(id),
      getAttendance(id, monthStart.toISOString().slice(0, 10), today),
      getPayrollRuns(id),
      getLeaveRequests(id),
    ]);
    if (sumRes.success) setSummary(sumRes.data as Record<string, unknown>);
    if (empRes.success) setEmployees((empRes.data as Record<string, unknown>[]) || []);
    if (attRes.success) setAttendance((attRes.data as Record<string, unknown>[]) || []);
    if (payRes.success) setPayrollRuns((payRes.data as Record<string, unknown>[]) || []);
    if (leaveRes.success) setLeaveRequests((leaveRes.data as Record<string, unknown>[]) || []);
  };

  useEffect(() => {
    const user = getStoredUser() as { roles?: string[] } | null;
    if (!user?.roles?.some((r) => ['PARTNER', 'RECEPTIONIST', 'HR_MANAGER', 'SUPER_ADMIN', 'ADMIN'].includes(r))) {
      router.push('/login');
      return;
    }
    getPartnerHotels().then((res) => {
      if (res.success && res.data) {
        const list = res.data as Record<string, unknown>[];
        setHotels(list);
        if (list[0]) {
          setHotelId(list[0].id as string);
          loadAll(list[0].id as string);
        }
      }
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (hotelId) loadAll(hotelId);
  }, [hotelId]);

  const handleCreateEmployee = async () => {
    const res = await createEmployee(hotelId, form);
    setMsg(res.success ? 'Employee added' : (res.error?.message || 'Failed'));
    if (res.success) { setShowForm(false); loadAll(hotelId); }
  };

  const handleClock = async (employeeId: string, action: 'IN' | 'OUT') => {
    const res = await clockAttendance(hotelId, employeeId, action);
    setMsg(res.success ? `Clocked ${action === 'IN' ? 'in' : 'out'}` : (res.error?.message || 'Failed'));
    if (res.success) loadAll(hotelId);
  };

  const handlePayroll = async () => {
    const res = await runPayroll(hotelId, monthStart.toISOString().slice(0, 10), today);
    setMsg(res.success ? 'Payroll processed' : (res.error?.message || 'Failed'));
    if (res.success) loadAll(hotelId);
  };

  if (loading) return <div className="text-center py-20 text-navy/50">Loading HR portal...</div>;

  const lastPayroll = summary?.lastPayroll as Record<string, unknown> | null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <PartnerNav />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">HR & Payroll</h1>
          <p className="text-sm text-navy/50">Employees, attendance tracking & payroll runs</p>
        </div>
        {hotels.length > 1 && (
          <select value={hotelId} onChange={(e) => setHotelId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {hotels.map((h) => (
              <option key={h.id as string} value={h.id as string}>{h.name as string}</option>
            ))}
          </select>
        )}
      </div>

      {msg && <p className="mb-4 text-sm px-4 py-2 bg-sand rounded-lg text-navy">{msg}</p>}

      <div className="flex flex-wrap gap-2 mb-6">
        {(['overview', 'employees', 'attendance', 'leave', 'payroll'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-lg capitalize ${tab === t ? 'bg-navy text-white' : 'bg-sand text-navy'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Employees', value: summary.employeeCount },
            { label: 'Active', value: summary.activeCount },
            { label: 'Present Today', value: summary.todayPresent },
            { label: 'Last Payroll Net', value: lastPayroll ? format(lastPayroll.totalNet as number) : '—' },
          ].map((s) => (
            <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
              <p className="text-xs text-navy/50">{s.label}</p>
              <p className="text-2xl font-bold text-navy mt-1">{s.value as string | number}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'employees' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b flex justify-between items-center">
            <span className="font-semibold text-navy">Employees ({employees.length})</span>
            <button onClick={() => setShowForm(!showForm)} className="px-3 py-1 bg-navy text-white text-sm rounded-lg">
              {showForm ? 'Cancel' : '+ Add Employee'}
            </button>
          </div>
          {showForm && (
            <div className="p-5 border-b bg-sand/30 grid grid-cols-2 md:grid-cols-3 gap-3">
              {(['firstName', 'lastName', 'email', 'phone', 'department', 'designation'] as const).map((f) => (
                <input key={f} placeholder={f} value={form[f]}
                  onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                  className="border rounded px-3 py-2 text-sm" />
              ))}
              <input type="date" value={form.joinDate}
                onChange={(e) => setForm((p) => ({ ...p, joinDate: e.target.value }))}
                className="border rounded px-3 py-2 text-sm" />
              <input type="number" placeholder="Basic salary" value={form.basicSalary}
                onChange={(e) => setForm((p) => ({ ...p, basicSalary: Number(e.target.value) }))}
                className="border rounded px-3 py-2 text-sm" />
              <button onClick={handleCreateEmployee} className="px-4 py-2 bg-coral text-white text-sm rounded-lg">Save</button>
            </div>
          )}
          <div className="divide-y">
            {employees.map((e) => (
              <div key={e.id as string} className="px-5 py-4 flex flex-wrap justify-between items-center gap-2">
                <div>
                  <p className="font-medium text-navy">{e.firstName as string} {e.lastName as string}</p>
                  <p className="text-xs text-navy/50">{e.employeeCode as string} · {e.designation as string} · {e.department as string}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-sm font-medium">{format(Number(e.basicSalary))}/mo</span>
                  <button onClick={() => handleClock(e.id as string, 'IN')}
                    className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Clock In</button>
                  <button onClick={() => handleClock(e.id as string, 'OUT')}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Clock Out</button>
                  <button onClick={() => requestLeave(hotelId, {
                    employeeId: e.id, startDate: today, endDate: today, reason: 'Personal leave',
                  }).then(() => loadAll(hotelId))} className="px-2 py-1 text-xs bg-sand text-navy rounded">Request Leave</button>
                </div>
              </div>
            ))}
            {employees.length === 0 && <p className="p-8 text-center text-navy/40 text-sm">No employees yet</p>}
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b font-semibold text-navy">Attendance This Month ({attendance.length})</div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {attendance.map((a) => {
              const emp = a.employee as Record<string, string>;
              return (
                <div key={a.id as string} className="px-5 py-3 flex justify-between text-sm">
                  <span className="text-navy">{emp.firstName} {emp.lastName} <span className="text-navy/40">({emp.employeeCode})</span></span>
                  <span className="text-navy/50">{(a.date as string).slice(0, 10)}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${a.status === 'PRESENT' ? 'bg-green-100 text-green-800' : 'bg-sand'}`}>
                    {a.status as string}
                  </span>
                  <span className="text-navy/40 text-xs">
                    {a.clockIn ? new Date(a.clockIn as string).toLocaleTimeString() : '—'}
                    {' → '}
                    {a.clockOut ? new Date(a.clockOut as string).toLocaleTimeString() : '—'}
                  </span>
                </div>
              );
            })}
            {attendance.length === 0 && <p className="p-8 text-center text-navy/40 text-sm">No attendance records</p>}
          </div>
        </div>
      )}

      {tab === 'leave' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b font-semibold text-navy">Leave Requests ({leaveRequests.length})</div>
          <div className="divide-y">
            {leaveRequests.map((l) => {
              const emp = l.employee as Record<string, string>;
              return (
                <div key={l.id as string} className="px-5 py-4 flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <p className="font-medium text-navy">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-navy/50">{(l.startDate as string).slice(0, 10)} — {(l.endDate as string).slice(0, 10)} · {l.reason as string}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${l.status === 'APPROVED' ? 'bg-green-100 text-green-800' : l.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-700'}`}>{l.status as string}</span>
                    {l.status === 'PENDING' && (
                      <>
                        <button onClick={() => approveLeave(hotelId, l.id as string, true).then(() => loadAll(hotelId))} className="text-xs px-2 py-1 bg-green-600 text-white rounded">Approve</button>
                        <button onClick={() => approveLeave(hotelId, l.id as string, false).then(() => loadAll(hotelId))} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Reject</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {leaveRequests.length === 0 && <p className="p-8 text-center text-navy/40 text-sm">No leave requests</p>}
          </div>
        </div>
      )}

      {tab === 'payroll' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-5 flex flex-wrap justify-between items-center gap-4">
            <div>
              <p className="font-semibold text-navy">Run Payroll</p>
              <p className="text-xs text-navy/50">
                Period: {monthStart.toISOString().slice(0, 10)} to {today}
              </p>
            </div>
            <button onClick={handlePayroll} className="px-4 py-2 bg-navy text-white text-sm rounded-lg">
              Process Payroll
            </button>
          </div>
          {payrollRuns.map((run) => (
            <div key={run.id as string} className="bg-white border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b flex justify-between">
                <span className="font-semibold text-navy">
                  {(run.periodStart as string).slice(0, 10)} — {(run.periodEnd as string).slice(0, 10)}
                </span>
                <span className="text-sm text-green-700 font-medium">Net: {format(Number(run.totalNet))}</span>
              </div>
              <div className="divide-y">
                {((run.payslips as Record<string, unknown>[]) || []).map((ps) => {
                  const emp = ps.employee as Record<string, string>;
                  return (
                    <div key={ps.id as string} className="px-5 py-3 flex justify-between text-sm">
                      <span>{emp.firstName} {emp.lastName}</span>
                      <span className="text-navy/50">{ps.daysPresent as number} days present</span>
                      <span className="font-medium">{format(Number(ps.netSalary))}</span>
                      <button onClick={() => downloadPayslip(hotelId, ps.id as string)} className="text-xs text-coral hover:underline">PDF</button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {payrollRuns.length === 0 && (
            <p className="text-center text-navy/40 text-sm py-8">No payroll runs yet. Add employees and process attendance first.</p>
          )}
        </div>
      )}
    </div>
  );
}
