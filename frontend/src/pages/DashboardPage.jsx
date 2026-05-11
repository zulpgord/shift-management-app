import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shiftsAPI, assignmentsAPI } from '../services/api';

function LeilaLogo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3px' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 900, fontSize: '2.4rem', color: '#111', letterSpacing: '-1px' }}>
          Leila
        </span>
        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#e00', display: 'inline-block', marginTop: '4px' }} />
      </div>
      <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '0.7rem', color: '#444', letterSpacing: '0.5px', marginTop: '-2px' }}>
        la rete degli oggetti
      </span>
    </div>
  );
}

// ── Helper: colore in base allo stato del turno ──────────────────────────────
function getShiftColors(shift, isMyShift) {
  if (shift.cancelled) return {
    cell: 'bg-yellow-100 text-yellow-600',
    card: 'border-yellow-200 bg-yellow-50 opacity-75',
    badge: 'bg-yellow-200 text-yellow-700',
    dot: 'bg-yellow-300',
  };
  if (isMyShift) return {
    cell: 'bg-blue-100 text-blue-800',
    card: 'border-blue-200 bg-blue-50',
    badge: 'bg-blue-200 text-blue-800',
    dot: 'bg-blue-300',
  };
  if (shift.assigned_count === 0) return {
    cell: 'bg-red-100 text-red-800',
    card: 'border-red-200 bg-red-50',
    badge: 'bg-red-200 text-red-800',
    dot: 'bg-red-400',
  };
  if (shift.assigned_count < shift.required_count) return {
    cell: 'bg-yellow-100 text-yellow-800',
    card: 'border-yellow-200 bg-yellow-50',
    badge: 'bg-yellow-200 text-yellow-800',
    dot: 'bg-yellow-400',
  };
  return {
    cell: 'bg-green-100 text-green-800',
    card: 'border-green-200 bg-green-50',
    badge: 'bg-green-200 text-green-800',
    dot: 'bg-green-400',
  };
}

function ShiftModal({ shift, userAssignments, onClose, onAssign, onCancel }) {
  if (!shift) return null;
  const fmt = (dt) => new Date(dt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (dt) => new Date(dt).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const myAssignment = userAssignments.find(a => a.shift_id === shift.id && a.status === 'assigned');
  const isAssigned = !!myAssignment;
  const fullyC = shift.assigned_count >= shift.required_count;
  const partial = shift.assigned_count > 0 && shift.assigned_count < shift.required_count;
  const assignedUsers = shift.assigned_users || [];
  const [isBooking, setIsBooking] = useState(false);
  const statusLabel = shift.cancelled ? 'Annullato'
    : isAssigned ? '✓ Sei registrato'
    : fullyC ? 'Coperto'
    : partial ? 'Parzialmente coperto'
    : 'Non coperto';
  const statusColor = shift.cancelled ? 'bg-yellow-100 text-yellow-700'
    : isAssigned ? 'bg-blue-100 text-blue-800'
    : fullyC ? 'bg-green-100 text-green-800'
    : partial ? 'bg-yellow-100 text-yellow-800'
    : 'bg-red-100 text-red-800';
  const countColor = shift.cancelled ? 'text-yellow-600'
    : isAssigned ? 'text-blue-700'
    : fullyC ? 'text-green-700'
    : partial ? 'text-yellow-700'
    : 'text-red-600';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        {shift.cancelled && (
          <div className="mb-3 px-3 py-2 bg-yellow-100 border border-yellow-200 rounded-lg text-yellow-700 text-sm font-medium text-center">
            ⚠️ Questo turno è stato annullato
          </div>
        )}
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-gray-900">{shift.location_name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-base">📅</span>
            <span className="text-sm capitalize">{fmtDate(shift.start_time)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-base">🕐</span>
            <span className="text-sm">{fmt(shift.start_time)} — {fmt(shift.end_time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">👥</span>
            <span className={`text-sm font-semibold ${countColor}`}>
              {shift.assigned_count} / {shift.required_count} volontari
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>
        {assignedUsers.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Iscritti</p>
            <div className="space-y-1">
              {assignedUsers.map((name, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </span>
                  {name}
                </div>
              ))}
            </div>
          </div>
        )}
        {shift.cancelled ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-center text-yellow-700 text-sm">
            Questo turno è stato annullato dall'organizzazione.
          </div>
        ) : isAssigned ? (
          <div className="space-y-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-center text-blue-700 text-sm font-medium">
              ✓ Sei registrato a questo turno
            </div>
            <button
              onClick={() => { onCancel(myAssignment.id); onClose(); }}
              className="w-full bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"
            >
              Annulla partecipazione
            </button>
          </div>
        ) : (
          <button
            onClick={async () => { setIsBooking(true); await onAssign(shift.id); setIsBooking(false); onClose(); }}
            disabled={isBooking}
            className={`w-full bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${isBooking ? 'opacity-60 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
          >
            {isBooking ? '⏳ Prenotazione in corso...' : '+ Partecipa a questo turno'}
          </button>
        )}
      </div>
    </div>
  );
}

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const DAYS_IT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [shifts, setShifts] = useState([]);
  const [userAssignments, setUserAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('calendario');
  const [selectedShift, setSelectedShift] = useState(null);
  const [toast, setToast] = useState(null);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    if (!user.id) { navigate('/auth'); return; }
    loadShifts();
  }, []);

  const loadShifts = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [shiftsRes, assignmentsRes] = await Promise.all([
        shiftsAPI.getShifts(),
        assignmentsAPI.getUserAssignments(),
      ]);
      setShifts(shiftsRes.data);
      setUserAssignments(assignmentsRes.data);
    } catch (err) {
      setError('Errore nel caricamento');
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const showToast = (msg, duration = 3500) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  };

  const handleAssign = async (shiftId) => {
    try {
      await assignmentsAPI.assignShift(shiftId);
      await loadShifts(true);
      showToast('✓ Prenotazione confermata!');
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.error || 'Errore nella prenotazione'));
    }
  };

  const handleCancel = async (assignmentId) => {
    if (!window.confirm('Annullare la prenotazione?')) return;
    try {
      await assignmentsAPI.cancelAssignment(assignmentId);
      await loadShifts(true);
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.error || 'Errore'));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  const prevMonth = () => setCalMonth(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  const nextMonth = () => setCalMonth(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
  const goToday = () => { const n = new Date(); setCalMonth({ year: n.getFullYear(), month: n.getMonth() }); };

  // ── Derived values filtered to selected month ────────────────────────────
  const monthShifts = shifts.filter(s => {
    const d = new Date(s.start_time);
    return d.getFullYear() === calMonth.year && d.getMonth() === calMonth.month;
  });
  // Escludi annullati dal calcolo copertura
  const activeMonthShifts = monthShifts.filter(s => !s.cancelled);
  const coveredCount = activeMonthShifts.filter(s => s.assigned_count >= s.required_count).length;
  const partiallyCoveredCount = activeMonthShifts.filter(s => s.assigned_count > 0 && s.assigned_count < s.required_count).length;
  const coveragePercent = activeMonthShifts.length > 0
    ? Math.round((coveredCount + partiallyCoveredCount) / activeMonthShifts.length * 100)
    : 0;
  const myMonthBookings = userAssignments.filter(a => {
    if (a.status !== 'assigned') return false;
    const d = new Date(a.start_time);
    return d.getFullYear() === calMonth.year && d.getMonth() === calMonth.month;
  });
  const coverageColor = coveragePercent >= 80
    ? { bg: 'bg-green-50', text: 'text-green-700', num: 'text-green-600', border: 'border-green-100' }
    : coveragePercent >= 50
    ? { bg: 'bg-yellow-50', text: 'text-yellow-700', num: 'text-yellow-600', border: 'border-yellow-100' }
    : { bg: 'bg-red-50', text: 'text-red-700', num: 'text-red-600', border: 'border-red-100' };

  // ── Calendar grid ────────────────────────────────────────────────────────
  const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
  const rawFirstDay = new Date(calMonth.year, calMonth.month, 1).getDay();
  const firstDay = (rawFirstDay + 6) % 7;
  const shiftsByDay = {};
  monthShifts.forEach(shift => {
    const day = new Date(shift.start_time).getDate();
    if (!shiftsByDay[day]) shiftsByDay[day] = [];
    shiftsByDay[day].push(shift);
  });
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = i - firstDay + 1;
    return d >= 1 && d <= daysInMonth ? d : null;
  });

  const fmt = (dt) => new Date(dt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (dt) => new Date(dt).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <ShiftModal
        shift={selectedShift}
        userAssignments={userAssignments}
        onClose={() => setSelectedShift(null)}
        onAssign={handleAssign}
        onCancel={handleCancel}
      />
      {toast && (
        <div
          className="fixed top-6 left-1/2 z-[100] px-6 py-3 rounded-xl shadow-xl font-semibold text-sm text-white"
          style={{ transform: 'translateX(-50%)', whiteSpace: 'nowrap', backgroundColor: toast.startsWith('❌') ? '#dc2626' : '#16a34a' }}
        >
          {toast}
        </div>
      )}
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <LeilaLogo />
          <div className="flex items-center gap-3">
            {user.role === 'admin' && (
              <button onClick={() => navigate('/admin')} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700 font-medium">
                Admin
              </button>
            )}
            <span className="text-gray-600 text-sm">{user.name}</span>
            <button onClick={handleLogout} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm hover:bg-red-100 font-medium">
              Esci
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* ── Month navigation (shared) ── */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xl font-bold shadow-sm">‹</button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-800">{MONTHS_IT[calMonth.month]} {calMonth.year}</h2>
            <button onClick={goToday} className="text-xs px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-medium">Oggi</button>
          </div>
          <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xl font-bold shadow-sm">›</button>
        </div>

        {/* ── Stats cards ── */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-xl shadow-sm border ${coverageColor.bg} ${coverageColor.border}`}>
            <p className={`text-sm font-medium ${coverageColor.text}`}>Copertura del mese</p>
            <p className={`text-3xl font-bold ${coverageColor.num}`}>{coveragePercent}%</p>
            <p className={`text-xs mt-1 ${coverageColor.text} opacity-80`}>
              {coveredCount + partiallyCoveredCount}/{activeMonthShifts.length} turni coperti o parziali
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl shadow-sm">
            <p className="text-sm font-medium text-blue-700">Le mie prenotazioni</p>
            <p className="text-3xl font-bold text-blue-600">{myMonthBookings.length}</p>
            <p className="text-xs mt-1 text-blue-600 opacity-80">questo mese</p>
          </div>
        </div>

        {/* ── View toggle ── */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {['calendario', 'lista'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${viewMode === mode ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {mode === 'calendario' ? '📅 Calendario' : '📋 Lista'}
            </button>
          ))}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Caricamento...</div>
        ) : (
          <>
            {/* ── Calendario ── */}
            {viewMode === 'calendario' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="grid grid-cols-7 mb-1">
                  {DAYS_IT.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((day, idx) => {
                    const dayShifts = day ? (shiftsByDay[day] || []) : [];
                    const today = new Date();
                    const isToday = day && today.getDate() === day && today.getMonth() === calMonth.month && today.getFullYear() === calMonth.year;
                    return (
                      <div
                        key={idx}
                        className={`min-h-[90px] rounded-lg p-1 ${day ? 'border border-gray-100 bg-gray-50' : ''} ${isToday ? 'border-indigo-300 bg-indigo-50' : ''}`}
                      >
                        {day && (
                          <>
                            <p className={`text-xs font-semibold mb-1 px-0.5 ${isToday ? 'text-indigo-600' : 'text-gray-500'}`}>{day}</p>
                            <div className="space-y-0.5">
                              {dayShifts.map(shift => {
                                const isMyShift = userAssignments.some(a => a.shift_id === shift.id && a.status === 'assigned');
                                const colors = getShiftColors(shift, isMyShift);
                                const assignedUsers = shift.assigned_users || [];
                                return (
                                  <div
                                    key={shift.id}
                                    onClick={() => setSelectedShift(shift)}
                                    className={`text-xs px-1 py-0.5 rounded font-medium cursor-pointer hover:opacity-80 transition-opacity ${colors.cell} ${shift.cancelled ? 'opacity-70' : ''}`}
                                  >
                                    <div className="truncate font-semibold">
                                      {shift.cancelled && <span className="mr-0.5">⚠</span>}
                                      {shift.location_name}
                                    </div>
                                    <div className="text-xs opacity-75">{fmt(shift.start_time)}–{fmt(shift.end_time)}</div>
                                    {shift.cancelled ? (
                                      <div className="text-xs opacity-75">Annullato</div>
                                    ) : assignedUsers.length > 0 && (
                                      <div className="truncate opacity-75 mt-0.5">
                                        {assignedUsers.slice(0, 2).map(n => n.split(' ')[0]).join(', ')}
                                        {assignedUsers.length > 2 && ` +${assignedUsers.length - 2}`}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-300"></div><span className="text-xs text-gray-500">I miei turni</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-400"></div><span className="text-xs text-gray-500">Copertura completa</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-yellow-400"></div><span className="text-xs text-gray-500">Parzialmente coperto</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-400"></div><span className="text-xs text-gray-500">Nessun volontario</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-yellow-200 border border-yellow-300"></div><span className="text-xs text-gray-500">⚠ Annullato</span></div>
                  <div className="flex items-center gap-1.5 ml-auto"><span className="text-xs text-gray-400 italic">Clicca un turno per aprirlo</span></div>
                </div>
              </div>
            )}

            {/* ── Lista ── */}
            {viewMode === 'lista' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4 text-gray-800">
                  Turni — {MONTHS_IT[calMonth.month]} {calMonth.year}
                </h2>
                {monthShifts.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Nessun turno in questo mese</p>
                ) : (
                  <div className="space-y-3">
                    {monthShifts.map(shift => {
                      const isMyShift = userAssignments.some(a => a.shift_id === shift.id && a.status === 'assigned');
                      const myAssignment = userAssignments.find(a => a.shift_id === shift.id && a.status === 'assigned');
                      const colors = getShiftColors(shift, isMyShift);
                      const assignedUsers = shift.assigned_users || [];
                      const statusLabel = shift.cancelled
                        ? 'Annullato'
                        : shift.assigned_count === 0
                        ? 'Nessun volontario'
                        : shift.assigned_count < shift.required_count
                        ? `${shift.assigned_count}/${shift.required_count} volontari`
                        : `${shift.assigned_count}/${shift.required_count} ✓`;
                      return (
                        <div key={shift.id} className={`border rounded-xl p-4 ${colors.card}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`font-semibold ${shift.cancelled ? 'text-gray-400' : 'text-gray-900'}`}>
                                  {shift.location_name}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                                  {statusLabel}
                                </span>
                                {isMyShift && !shift.cancelled && (
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-600 text-white">✓ Mio</span>
                                )}
                              </div>
                              <p className={`text-sm ${shift.cancelled ? 'text-gray-400' : 'text-gray-500'}`}>{fmtDate(shift.start_time)}</p>
                              <p className={`text-sm ${shift.cancelled ? 'text-gray-400' : 'text-gray-500'}`}>{fmt(shift.start_time)} — {fmt(shift.end_time)}</p>
                              {assignedUsers.length > 0 && !shift.cancelled && (
                                <p className="text-gray-400 text-xs mt-1">👤 {assignedUsers.join(', ')}</p>
                              )}
                            </div>
                            {!shift.cancelled && (
                              <button
                                onClick={() => isMyShift ? handleCancel(myAssignment?.id) : handleAssign(shift.id)}
                                className={`ml-4 px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0 ${
                                  isMyShift ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                              >
                                {isMyShift ? '✓ Prenotato' : '+ Partecipa'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
