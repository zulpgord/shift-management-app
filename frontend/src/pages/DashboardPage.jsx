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

function ShiftModal({ shift, userAssignments, onClose, onAssign, onCancel }) {
  if (!shift) return null;
  const fmt = (dt) => new Date(dt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (dt) => new Date(dt).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const myAssignment = userAssignments.find(a => a.shift_id === shift.id && a.status === 'assigned');
  const isAssigned = !!myAssignment;
  const covered = shift.assigned_count >= 1;
  const assignedUsers = shift.assigned_users || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
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
            <span className={`text-sm font-semibold ${covered ? 'text-green-700' : 'text-red-600'}`}>
              {shift.assigned_count} / {shift.required_count} volontari
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${covered ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {covered ? 'Coperto' : 'Non coperto'}
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

        {isAssigned ? (
          <div className="space-y-2">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-center text-indigo-700 text-sm font-medium">
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
            onClick={() => { onAssign(shift.id); onClose(); }}
            className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            + Partecipa a questo turno
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
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    if (!user.id) { navigate('/auth'); return; }
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const handleAssign = async (shiftId) => {
    try {
      await assignmentsAPI.assignShift(shiftId);
      loadShifts();
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nella prenotazione');
    }
  };

  const handleCancel = async (assignmentId) => {
    if (!window.confirm('Annullare la prenotazione?')) return;
    try {
      await assignmentsAPI.cancelAssignment(assignmentId);
      loadShifts();
    } catch (err) {
      alert(err.response?.data?.error || 'Errore');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  const prevMonth = () => setCalMonth(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  const nextMonth = () => setCalMonth(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });

  const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
  const rawFirstDay = new Date(calMonth.year, calMonth.month, 1).getDay();
  const firstDay = (rawFirstDay + 6) % 7;

  const shiftsByDay = {};
  shifts.forEach(shift => {
    const d = new Date(shift.start_time);
    if (d.getFullYear() === calMonth.year && d.getMonth() === calMonth.month) {
      const day = d.getDate();
      if (!shiftsByDay[day]) shiftsByDay[day] = [];
      shiftsByDay[day].push(shift);
    }
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
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-gray-500 text-sm">Turni disponibili</p>
            <p className="text-3xl font-bold text-indigo-600">{shifts.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-gray-500 text-sm">Le mie prenotazioni</p>
            <p className="text-3xl font-bold text-green-600">
              {userAssignments.filter(a => a.status === 'assigned').length}
            </p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {['calendario', 'lista'].map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${viewMode === mode ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              {mode === 'calendario' ? '📅 Calendario' : '📋 Lista'}
            </button>
          ))}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Caricamento...</div>
        ) : (
          <>
            {viewMode === 'calendario' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xl font-bold">‹</button>
                  <h2 className="text-xl font-bold text-gray-800">{MONTHS_IT[calMonth.month]} {calMonth.year}</h2><button onClick={() => { const n = new Date(); setCalMonth({ year: n.getFullYear(), month: n.getMonth() }); }} className="text-xs px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-medium">Oggi</button>
                  <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xl font-bold">›</button>
                </div>
                <div className="grid grid-cols-7 mb-1">
                  {DAYS_IT.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((day, idx) => {
                    const dayShifts = day ? (shiftsByDay[day] || []) : [];
                    const isToday = day && new Date().getDate() === day && new Date().getMonth() === calMonth.month && new Date().getFullYear() === calMonth.year;
                    return (
                      <div key={idx} className={`min-h-[90px] rounded-lg p-1 ${day ? 'border border-gray-100 bg-gray-50' : ''} ${isToday ? 'border-indigo-300 bg-indigo-50' : ''}`}>
                        {day && (
                          <>
                            <p className={`text-xs font-semibold mb-1 px-0.5 ${isToday ? 'text-indigo-600' : 'text-gray-500'}`}>{day}</p>
                            <div className="space-y-0.5">
                              {dayShifts.map(shift => {
                                const covered = shift.assigned_count >= 1;
                                const isMyShift = userAssignments.some(a => a.shift_id === shift.id && a.status === 'assigned');
                                const assignedUsers = shift.assigned_users || [];
                                return (
                                  <div
                                    key={shift.id}
                                    onClick={() => setSelectedShift(shift)}
                                    className={`text-xs px-1 py-0.5 rounded font-medium cursor-pointer hover:opacity-80 transition-opacity ${covered ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} ${isMyShift ? 'ring-1 ring-indigo-400' : ''}`}
                                  >
                                    <div className="truncate font-semibold">{shift.location_name}</div>
                                    <div className="text-xs opacity-75">{fmt(shift.start_time)}–{fmt(shift.end_time)}</div>
                                    {assignedUsers.length > 0 && (
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
                <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-400"></div><span className="text-xs text-gray-500">Coperto (≥1 volontario)</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-400"></div><span className="text-xs text-gray-500">Non coperto</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-indigo-100 ring-1 ring-indigo-400"></div><span className="text-xs text-gray-500">Mio turno</span></div>
                  <div className="flex items-center gap-2 ml-auto"><span className="text-xs text-gray-400 italic">Clicca un turno per aprirlo</span></div>
                </div>
              </div>
            )}

            {viewMode === 'lista' && (
              <>
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                  <h2 className="text-lg font-bold mb-4 text-gray-800">Turni disponibili</h2>
                  {shifts.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Nessun turno presente</p>
                  ) : (
                    <div className="space-y-3">
                      {shifts.map(shift => {
                        const isAssigned = userAssignments.some(a => a.shift_id === shift.id && a.status === 'assigned');
                        const covered = shift.assigned_count >= 1;
                        const myAssignment = userAssignments.find(a => a.shift_id === shift.id && a.status === 'assigned');
                        const assignedUsers = shift.assigned_users || [];
                        return (
                          <div key={shift.id} className={`border rounded-xl p-4 ${covered ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-gray-900">{shift.location_name}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${covered ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                    {shift.assigned_count}/{shift.required_count} volontari
                                  </span>
                                </div>
                                <p className="text-gray-500 text-sm">{fmtDate(shift.start_time)}</p>
                                <p className="text-gray-500 text-sm">{fmt(shift.start_time)} — {fmt(shift.end_time)}</p>
                                {assignedUsers.length > 0 && (
                                  <p className="text-gray-400 text-xs mt-1">👤 {assignedUsers.join(', ')}</p>
                                )}
                              </div>
                              <button
                                onClick={() => isAssigned ? handleCancel(myAssignment?.id) : handleAssign(shift.id)}
                                className={`ml-4 px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0 ${isAssigned ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                {isAssigned ? '✓ Prenotato' : '+ Partecipa'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-bold mb-4 text-gray-800">I miei turni</h2>
                  {userAssignments.filter(a => a.status === 'assigned').length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Nessuna prenotazione</p>
                  ) : (
                    <div className="space-y-3">
                      {userAssignments.filter(a => a.status === 'assigned').map(a => (
                        <div key={a.id} className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-gray-900">{a.location_name}</span>
                            <p className="text-gray-500 text-sm">{fmtDate(a.start_time)}</p>
                            <p className="text-gray-500 text-sm">{fmt(a.start_time)} — {fmt(a.end_time)}</p>
                          </div>
                          <button onClick={() => handleCancel(a.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">
                            Annulla
          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
