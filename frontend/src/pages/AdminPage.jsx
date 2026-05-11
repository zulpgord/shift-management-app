import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { shiftsAPI, locationsAPI, adminAPI } from '../services/api';

// ── Helper: get Monday of a given date's week ────────────────────────────────
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtShortDate(date) {
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

// ─── Sezione: Turni (crea + lista con filtro settimana) ──────────────────────
function ShiftsSection({ locations }) {
  const [showForm, setShowForm] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [weeks, setWeeks] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    location_id: '',
    date: '',
    start_hour: '09:00',
    duration: 2,
    required_count: 1,
  });

  // Shifts list state
  const [allShifts, setAllShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));

  // Edit state
  const [editingShift, setEditingShift] = useState(null);
  const [editData, setEditData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (locations.length > 0 && !formData.location_id) {
      setFormData((p) => ({ ...p, location_id: String(locations[0].id) }));
    }
  }, [locations]);

  const loadShifts = useCallback(async () => {
    setShiftsLoading(true);
    try {
      const res = await shiftsAPI.getShifts();
      setAllShifts(res.data);
    } catch {
      // silent
    } finally {
      setShiftsLoading(false);
    }
  }, []);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  // Auto-fix required_count=1 for future shifts with missing value
  useEffect(() => {
    adminAPI.fixFutureShifts().catch(() => {});
  }, []);

  // ── Edit helpers ──────────────────────────────────────────────────────────
  const startEditShift = (shift) => {
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    const durationHrs = (end - start) / (1000 * 60 * 60);
    const pad = (n) => String(n).padStart(2, '0');
    setEditingShift(shift.id);
    setEditData({
      location_id: String(shift.location_id),
      date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      start_hour: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      duration: durationHrs,
      required_count: shift.required_count || 1,
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((p) => ({
      ...p,
      [name]: (name === 'required_count' || name === 'duration') ? parseFloat(value) : value,
    }));
  };

  const handleEditSave = async (shiftId) => {
    setSavingEdit(true);
    try {
      const [year, month, day] = editData.date.split('-').map(Number);
      const [hours, minutes] = editData.start_hour.split(':').map(Number);
      const start = new Date(year, month - 1, day, hours, minutes, 0);
      const end = new Date(start.getTime() + editData.duration * 3600000);
      await shiftsAPI.updateShift(shiftId, {
        location_id: editData.location_id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        required_count: editData.required_count,
      });
      setEditingShift(null);
      await loadShifts();
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nel salvataggio');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!confirm('Eliminare questo turno? L\'operazione non è reversibile.')) return;
    try {
      await shiftsAPI.deleteShift(shiftId);
      await loadShifts();
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nell\'eliminazione');
    }
  };

  const weekEnd = addDays(weekStart, 6);

  const weekShifts = allShifts.filter(s => {
    const d = new Date(s.start_time);
    return d >= weekStart && d <= new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59);
  }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const prevWeek = () => setWeekStart(w => addDays(w, -7));
  const nextWeek = () => setWeekStart(w => addDays(w, 7));
  const goCurrentWeek = () => setWeekStart(getWeekStart(new Date()));

  const isCurrentWeek = getWeekStart(new Date()).getTime() === weekStart.getTime();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({
      ...p,
      [name]: (name === 'required_count' || name === 'duration') ? parseFloat(value) : value,
    }));
  };

  const buildShift = (offsetDays = 0) => {
    const [year, month, day] = formData.date.split('-').map(Number);
    const [hours, minutes] = formData.start_hour.split(':').map(Number);
    const start = new Date(year, month - 1, day + offsetDays * 7, hours, minutes, 0);
    const end = new Date(start.getTime() + formData.duration * 60 * 60 * 1000);
    return {
      location_id: formData.location_id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      required_count: formData.required_count,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.date) {
      alert('Seleziona una data');
      return;
    }
    setSubmitting(true);
    try {
      const count = repeat ? weeks : 1;
      const targets = Array.from({ length: count }, (_, i) => buildShift(i));
      await Promise.all(targets.map((t) => shiftsAPI.createShift(t)));
      alert(`✅ ${targets.length} turno/i creato/i!`);
      setShowForm(false);
      setFormData((p) => ({ ...p, date: '', start_hour: '09:00', duration: 2, required_count: 1 }));
      await loadShifts();
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nella creazione del turno');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (dt) => new Date(dt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const fmtDay = (dt) => new Date(dt).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="space-y-6">
      {/* ── Crea turno ── */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">📅 Turni</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm"
          >
            {showForm ? '❌ Annulla' : '➕ Nuovo Turno'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded">
            <div>
              <label className="block text-sm font-semibold mb-1">Location</label>
              <select
                name="location_id"
                value={formData.location_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Data</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Ora inizio</label>
                <input
                  type="time"
                  name="start_hour"
                  value={formData.start_hour}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Durata (ore)</label>
                <input
                  type="number"
                  name="duration"
                  min="0.5"
                  step="0.5"
                  value={formData.duration}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Volontari minimi</label>
              <input
                type="number"
                name="required_count"
                min="1"
                value={formData.required_count}
                onChange={handleChange}
                className="w-40 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="repeat"
                checked={repeat}
                onChange={(e) => setRepeat(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="repeat" className="text-sm font-semibold">Turno ripetitivo (settimanale)</label>
            </div>

            {repeat && (
              <div>
                <label className="block text-sm font-semibold mb-1">Numero di settimane</label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={weeks}
                  onChange={(e) => setWeeks(parseInt(e.target.value))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Verranno creati {weeks} turni, uno a settimana.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Creazione in corso...' : `Crea Turno${repeat ? ` (×${weeks})` : ''}`}
            </button>
          </form>
        )}
      </div>

      {/* ── Lista turni con filtro settimana ── */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">📋 Turni della settimana</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prevWeek}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
            >
              ‹
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center">
              {fmtShortDate(weekStart)} – {fmtShortDate(weekEnd)}
            </span>
            <button
              onClick={nextWeek}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
            >
              ›
            </button>
            {!isCurrentWeek && (
              <button
                onClick={goCurrentWeek}
                className="text-xs px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-medium ml-1"
              >
                Questa settimana
              </button>
            )}
          </div>
        </div>

        {shiftsLoading ? (
          <p className="text-gray-400 text-sm">Caricamento...</p>
        ) : weekShifts.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">Nessun turno questa settimana.</p>
        ) : (
          <div className="space-y-2">
            {weekShifts.map(shift => {
              const isEmpty = shift.assigned_count === 0;
              const covered = shift.assigned_count >= shift.required_count;
              const partial = !isEmpty && !covered;
              const cardCls = covered
                ? 'border-green-200 bg-green-50'
                : partial
                ? 'border-yellow-200 bg-yellow-50'
                : 'border-red-200 bg-red-50';
              const badgeCls = covered
                ? 'bg-green-200 text-green-800'
                : partial
                ? 'bg-yellow-200 text-yellow-800'
                : 'bg-red-200 text-red-800';
              const assignedUsers = shift.assigned_users || [];

              if (editingShift === shift.id) {
                return (
                  <div key={shift.id} className="border border-indigo-300 bg-indigo-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-indigo-700 mb-2">✏️ Modifica turno</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-gray-500">Location</label>
                        <select
                          name="location_id"
                          value={editData.location_id}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        >
                          {locations.map((l) => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500">Data</label>
                        <input
                          type="date"
                          name="date"
                          value={editData.date}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500">Ora inizio</label>
                        <input
                          type="time"
                          name="start_hour"
                          value={editData.start_hour}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500">Durata (ore)</label>
                        <input
                          type="number"
                          name="duration"
                          min="0.5"
                          step="0.5"
                          value={editData.duration}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500">Vol. minimi</label>
                        <input
                          type="number"
                          name="required_count"
                          min="1"
                          value={editData.required_count}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSave(shift.id)}
                        disabled={savingEdit}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingEdit ? 'Salvataggio...' : '✓ Salva'}
                      </button>
                      <button
                        onClick={() => setEditingShift(null)}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={shift.id}
                  className={`border rounded-lg p-3 flex justify-between items-start ${cardCls}`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-gray-900">{shift.location_name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badgeCls}`}>
                        {isEmpty ? 'Nessun volontario' : covered ? `${shift.assigned_count}/${shift.required_count} ✓` : `${shift.assigned_count}/${shift.required_count}`}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs">{fmtDay(shift.start_time)} · {fmt(shift.start_time)}–{fmt(shift.end_time)}</p>
                    {assignedUsers.length > 0 && (
                      <p className="text-gray-400 text-xs mt-0.5">👤 {assignedUsers.join(', ')}</p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => startEditShift(shift)}
                      className="p-1.5 rounded bg-white border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 text-gray-500 hover:text-indigo-600 transition-colors"
                      title="Modifica"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteShift(shift.id)}
                      className="p-1.5 rounded bg-white border border-gray-200 hover:bg-red-50 hover:border-red-300 text-gray-500 hover:text-red-600 transition-colors"
                      title="Elimina"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sezione: Utenti ──────────────────────────────────────────────────────────
function UsersSection() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data);
    } catch {
      alert('Errore nel caricamento utenti');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleRole = async (user) => {
    const newRole = user.role === 'admin' ? 'volunteer' : 'admin';
    if (!confirm(`Cambia il ruolo di ${user.name} a "${newRole}"?`)) return;
    try {
      await adminAPI.updateUserRole(user.id, newRole);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nel cambio ruolo');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">👥 Utenti registrati</h2>
      {loading ? (
        <p className="text-gray-400">Caricamento...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4">Nome</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Ruolo</th>
                <th className="pb-2">Azione</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium">{u.name}</td>
                  <td className="py-2 pr-4 text-gray-600">{u.email}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {u.role === 'admin' ? 'Admin' : 'Volontario'}
                    </span>
                  </td>
                  <td className="py-2">
                    {u.id !== currentUser.id ? (
                      <button
                        onClick={() => toggleRole(u)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        {u.role === 'admin' ? '→ Volontario' : '→ Admin'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">Tu</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Sezione: Statistiche ─────────────────────────────────────────────────────
function StatsSection() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState('');

  const MONTHS = [
    { value: '1', label: 'Gennaio' }, { value: '2', label: 'Febbraio' },
    { value: '3', label: 'Marzo' }, { value: '4', label: 'Aprile' },
    { value: '5', label: 'Maggio' }, { value: '6', label: 'Giugno' },
    { value: '7', label: 'Luglio' }, { value: '8', label: 'Agosto' },
    { value: '9', label: 'Settembre' }, { value: '10', label: 'Ottobre' },
    { value: '11', label: 'Novembre' }, { value: '12', label: 'Dicembre' },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (year) params.year = year;
      if (month) params.month = month;
      const res = await adminAPI.getStats(params);
      setStats(res.data);
    } catch {
      alert('Errore nel caricamento statistiche');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">📊 Statistiche prenotazioni</h2>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Anno</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tutti</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Mese</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tutti</option>
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">Caricamento...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Volontario</th>
                <th className="pb-2 pr-4 text-center">Prenotazioni</th>
                <th className="pb-2 pr-4 text-center">Attive</th>
                <th className="pb-2 pr-4 text-center">Annullate</th>
                <th className="pb-2 text-center">Ore totali</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={s.id} className={`border-b hover:bg-gray-50 ${s.total_bookings === 0 ? 'text-gray-400' : ''}`}>
                  <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
                  <td className="py-2 pr-4">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.email}</div>
                  </td>
                  <td className="py-2 pr-4 text-center font-semibold">{s.total_bookings}</td>
                  <td className="py-2 pr-4 text-center">
                    <span className="text-green-600 font-medium">{s.active_bookings}</span>
                  </td>
                  <td className="py-2 pr-4 text-center">
                    <span className="text-red-500">{s.cancelled_bookings}</span>
                  </td>
                  <td className="py-2 text-center text-indigo-600 font-medium">{s.total_hours}h</td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-gray-400">Nessun dato disponibile</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Sezione: Locations ───────────────────────────────────────────────────────
function LocationsSection() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', address: '' });

  const load = useCallback(async () => {
    try {
      const res = await locationsAPI.getLocations();
      setLocations(res.data);
    } catch {
      alert('Errore nel caricamento locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (loc) => {
    setEditingId(loc.id);
    setFormData({ name: loc.name, address: loc.address || '' });
    setShowForm(true);
  };

  const startNew = () => {
    setEditingId(null);
    setFormData({ name: '', address: '' });
    setShowForm(true);
  };

  const cancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', address: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await locationsAPI.updateLocation(editingId, formData);
      } else {
        await locationsAPI.createLocation(formData);
      }
      await load();
      cancel();
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nel salvataggio');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">📍 Locations</h2>
        {!showForm && (
          <button
            onClick={startNew}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm"
          >
            ➕ Aggiungi Location
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 mb-6 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold text-sm">{editingId ? 'Modifica Location' : 'Nuova Location'}</h3>
          <div>
            <label className="block text-sm font-semibold mb-1">Nome *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              required
              placeholder="es. Sede Centrale"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Indirizzo</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
              placeholder="es. Via Roma 1, Milano"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 text-sm"
            >
              {editingId ? 'Salva modifiche' : 'Aggiungi'}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 text-sm"
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-400">Caricamento...</p>
      ) : locations.length === 0 ? (
        <p className="text-gray-400 text-sm">Nessuna location ancora. Aggiungine una!</p>
      ) : (
        <ul className="divide-y">
          {locations.map((loc) => (
            <li key={loc.id} className="py-3 flex justify-between items-start">
              <div>
                <div className="font-medium">{loc.name}</div>
                {loc.address && <div className="text-sm text-gray-500">{loc.address}</div>}
              </div>
              <button
                onClick={() => startEdit(loc)}
                className="text-sm text-indigo-600 hover:underline ml-4 shrink-0"
              >
                ✏️ Modifica
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── AdminPage principale ─────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [tab, setTab] = useState('turni');
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    locationsAPI.getLocations()
      .then((res) => setLocations(res.data))
      .catch(() => {});
  }, []);

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ Accesso negato</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-indigo-600 text-white px-4 py-2 rounded"
          >
            Torna alla Dashboard
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'turni', label: '📅 Turni' },
    { id: 'utenti', label: '👥 Utenti' },
    { id: 'statistiche', label: '📊 Statistiche' },
    { id: 'locations', label: '📍 Locations' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-indigo-600">👨‍💼 Pannello Admin</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-indigo-600 hover:underline text-sm"
          >
            ← Dashboard
          </button>
        </div>
        {/* Tab bar */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 border-t overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        {tab === 'turni' && <ShiftsSection locations={locations} />}
        {tab === 'utenti' && <UsersSection />}
        {tab === 'statistiche' && <StatsSection />}
        {tab === 'locations' && <LocationsSection />}
      </main>
    </div>
  );
}
