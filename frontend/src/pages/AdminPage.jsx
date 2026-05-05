import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { shiftsAPI, locationsAPI, adminAPI } from '../services/api';

// ── Crea Turno ────────────────────────────────────────────────────────────────
function ShiftsSection({ locations }) {
  const [showForm, setShowForm] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [weeks, setWeeks] = useState(4);
  const [formData, setFormData] = useState({
    location_id: '',
    date: '',
    start_hour: '09:00',
    duration: 2,
    required_count: 1,
    min_participants: 1,
  });

  useEffect(() => {
    if (locations.length > 0 && !formData.location_id)
      setFormData((p) => ({ ...p, location_id: String(locations[0].id) }));
  }, [locations]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({
      ...p,
      [name]: (name === 'required_count' || name === 'duration' || name === 'min_participants') ? parseFloat(value) : value,
    }));
  };

  const [shifts, setShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [editForm, setEditForm] = useState({ date: '', start_hour: '09:00', end_hour: '18:00', required_count: 1, min_participants: 1 });

  const loadShifts = useCallback(async () => {
    setLoadingShifts(true);
    try { const res = await shiftsAPI.getShifts(); setShifts(res.data); }
    catch { }
    finally { setLoadingShifts(false); }
  }, []);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo turno?')) return;
    try { await shiftsAPI.deleteShift(id); loadShifts(); }
    catch (err) { alert(err.response?.data?.error || "Errore nell'eliminazione"); }
  };
  
  const startEdit = (s) => {
    const dt = new Date(s.start_time);
    const endDt = new Date(s.end_time);
    setEditForm({
      date: dt.toISOString().slice(0, 10),
      start_hour: dt.toTimeString().slice(0, 5),
      end_hour: endDt.toTimeString().slice(0, 5),
      required_count: s.required_count,
    });
    setEditingShift(s.id);
  };

  const cancelEdit = () => setEditingShift(null);

  const handleEditSubmit = async (id) => {
    try {
      const base = new Date(`${editForm.date}T${editForm.start_hour}:00`);
      const end = new Date(`${editForm.date}T${editForm.end_hour}:00`);
      await shiftsAPI.updateShift(id, {
        start_time: base.toISOString(),
        end_time: end.toISOString(),
        required_count: editForm.required_count,
      });
      setEditingShift(null);
      loadShifts();
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nella modifica');
    }
  };


  const buildShift = (offsetDays = 0) => {
    const base = new Date(`${formData.date}T${formData.start_hour}:00`);
    base.setDate(base.getDate() + offsetDays * 7);
    const end = new Date(base.getTime() + formData.duration * 60 * 60 * 1000);
    return {
      location_id: formData.location_id,
      start_time: base.toISOString(),
      end_time: end.toISOString(),
      required_count: formData.required_count,
      min_participants: formData.min_participants,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const targets = repeat
        ? Array.from({ length: weeks }, (_, i) => buildShift(i))
        : [buildShift(0)];
      await Promise.all(targets.map((t) => shiftsAPI.createShift(t)));
      await loadShifts();
      alert(`✅ ${targets.length} turno/i creato/i!`);
      setShowForm(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nella creazione del turno');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">📅 Turni</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm">
          {showForm ? '❌ Annulla' : '➕ Nuovo Turno'}
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-semibold mb-1">Location</label>
            <select name="location_id" value={formData.location_id} onChange={handleChange} required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Data</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Ora inizio</label>
              <input type="time" name="start_hour" value={formData.start_hour} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Durata (ore)</label>
              <input type="number" name="duration" min="0.5" step="0.5" value={formData.duration} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Partecipanti massimi</label>
            <input type="number" name="required_count" min="1" value={formData.required_count} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Minimo per "coperto" 🟢</label>
            <input type="number" name="min_participants" min="1" value={formData.min_participants} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="repeat" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} className="w-4 h-4" />
            <label htmlFor="repeat" className="text-sm font-semibold">Turno ripetitivo settimanale</label>
          </div>
          {repeat && (
            <div>
              <label className="block text-sm font-semibold mb-1">Per quante settimane?</label>
              <input type="number" min="1" max="52" value={weeks} onChange={(e) => setWeeks(parseInt(e.target.value))}
                className="w-32 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <p className="text-xs text-gray-500 mt-1">Verranno creati {weeks} turni, uno a settimana.</p>
            </div>
          )}
          <button type="submit" className="w-full bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700">
            Crea Turno{repeat ? ` (×${weeks})` : ''}
          </button>
        </form>
      )}
      {!showForm && <p className="text-gray-400 text-sm">Seleziona location, giorno, ora e durata.</p>}
      <div className="mt-6 border-t pt-4">
        <h3 className="font-semibold text-sm text-gray-600 mb-3">Turni creati</h3>
        {loadingShifts ? (
          <p className="text-gray-400 text-sm">Caricamento...</p>
        ) : shifts.length === 0 ? (
          <p className="text-gray-400 text-sm">Nessun turno presente.</p>
        ) : (
          <ul className="divide-y">
            {shifts.map((s) => (
                                <li key={s.id} className="py-3">
                    {editingShift === s.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Data</label>
                            <input type="date" value={editForm.date}
                              onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Inizio</label>
                            <input type="time" value={editForm.start_hour}
                              onChange={e => setEditForm(p => ({ ...p, start_hour: e.target.value }))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Fine</label>
                            <input type="time" value={editForm.end_hour}
                              onChange={e => setEditForm(p => ({ ...p, end_hour: e.target.value }))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Partecipanti</label>
                          <input type="number" min="1" value={editForm.required_count}
                            onChange={e => setEditForm(p => ({ ...p, required_count: parseFloat(e.target.value) }))}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Minimo 🟢</label>
                          <input type="number" min="1" value={editForm.min_participants}
                            onChange={e => setEditForm(p => ({ ...p, min_participants: parseFloat(e.target.value) }))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditSubmit(s.id)}
                            className="text-xs text-white bg-indigo-600 px-3 py-1 rounded hover:bg-indigo-700">
                            ✔ Salva
                          </button>
                          <button onClick={cancelEdit}
                            className="text-xs text-gray-500 hover:underline">
                            Annulla
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">
                            {new Date(s.start_time).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {s.location_name || ('Location ' + s.location_id)} · min {s.min_participants || 1} / max {s.required_count}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0 ml-4">
                          <button onClick={() => startEdit(s)}
                            className="text-xs text-indigo-600 hover:underline">
                            ✏️ Modifica
                          </button>
                          <button onClick={() => handleDelete(s.id)}
                            className="text-xs text-red-500 hover:underline">
                            🗑️ Elimina
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Utenti ────────────────────────────────────────────────────────────────────
function UsersSection() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetModal, setResetModal] = useState(null); // { id, name }
  const [newPwd, setNewPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const load = useCallback(async () => {
    try { const res = await adminAPI.getUsers(); setUsers(res.data); }
    catch { alert('Errore nel caricamento utenti'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleRole = async (user) => {
    const newRole = user.role === 'admin' ? 'volunteer' : 'admin';
    if (!confirm(`Cambia il ruolo di ${user.name} a "${newRole}"?`)) return;
    try {
      await adminAPI.updateUserRole(user.id, newRole);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (err) { alert(err.response?.data?.error || 'Errore nel cambio ruolo'); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.resetUserPassword(resetModal.id, newPwd);
      alert(`✅ Password di ${resetModal.name} reimpostata!`);
      setResetModal(null);
      setNewPwd('');
    } catch (err) { alert(err.response?.data?.error || 'Errore nel reset password'); }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">👥 Utenti registrati</h2>
      {resetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80">
            <h3 className="font-bold mb-1">🔑 Reimposta password</h3>
            <p className="text-sm text-gray-500 mb-3">{resetModal.name}</p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Nuova password (min 6 caratteri)"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  required minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600 text-xs">
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded font-semibold hover:bg-indigo-700 text-sm">Salva</button>
                <button type="button" onClick={() => { setResetModal(null); setNewPwd(''); }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 text-sm">Annulla</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {loading ? <p className="text-gray-400">Caricamento...</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4">Nome</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Ruolo</th>
                <th className="pb-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium">{u.name}</td>
                  <td className="py-2 pr-4 text-gray-600">{u.email}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                      {u.role === 'admin' ? 'Admin' : 'Volontario'}
                    </span>
                  </td>
                  <td className="py-2 flex gap-3 flex-wrap">
                    {u.id !== currentUser.id
                      ? <button onClick={() => toggleRole(u)} className="text-xs text-indigo-600 hover:underline">
                          {u.role === 'admin' ? '→ Volontario' : '→ Admin'}
                        </button>
                      : <span className="text-xs text-gray-400">Tu</span>}
                    <button onClick={() => { setResetModal({ id: u.id, name: u.name }); setNewPwd(''); }}
                      className="text-xs text-orange-500 hover:underline">
                      🔑 Reset pwd
                    </button>
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

// ── Statistiche ───────────────────────────────────────────────────────────────
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
    } catch { alert('Errore nel caricamento statistiche'); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">📊 Statistiche prenotazioni</h2>
      <div className="flex gap-3 mb-4 flex-wrap">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Anno</label>
          <select value={year} onChange={(e) => setYear(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Tutti</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Mese</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Tutti</option>
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>
      {loading ? <p className="text-gray-400">Caricamento...</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-3">#</th>
                <th className="pb-2 pr-4">Volontario</th>
                <th className="pb-2 pr-4 text-center">Prenotazioni</th>
                <th className="pb-2 pr-4 text-center">Attive</th>
                <th className="pb-2 pr-4 text-center">Annullate</th>
                <th className="pb-2 text-center">Ore</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={s.id} className={`border-b hover:bg-gray-50 ${s.total_bookings === 0 ? 'text-gray-400' : ''}`}>
                  <td className="py-2 pr-3 text-gray-400">{i + 1}</td>
                  <td className="py-2 pr-4"><div className="font-medium">{s.name}</div><div className="text-xs text-gray-400">{s.email}</div></td>
                  <td className="py-2 pr-4 text-center font-semibold">{s.total_bookings}</td>
                  <td className="py-2 pr-4 text-center text-green-600 font-medium">{s.active_bookings}</td>
                  <td className="py-2 pr-4 text-center text-red-500">{s.cancelled_bookings}</td>
                  <td className="py-2 text-center text-indigo-600 font-medium">{s.total_hours}h</td>
                </tr>
              ))}
              {stats.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-gray-400">Nessun dato</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Locations ─────────────────────────────────────────────────────────────────
function LocationsSection() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', address: '' });

  const load = useCallback(async () => {
    try { const res = await locationsAPI.getLocations(); setLocations(res.data); }
    catch { alert('Errore nel caricamento locations'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (loc) => { setEditingId(loc.id); setFormData({ name: loc.name, address: loc.address || '' }); setShowForm(true); };
  const startNew = () => { setEditingId(null); setFormData({ name: '', address: '' }); setShowForm(true); };
  const cancel = () => { setShowForm(false); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await locationsAPI.updateLocation(editingId, formData);
      else await locationsAPI.createLocation(formData);
      await load(); cancel();
    } catch (err) { alert(err.response?.data?.error || 'Errore nel salvataggio'); }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">📍 Locations</h2>
        {!showForm && <button onClick={startNew} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm">➕ Aggiungi</button>}
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 mb-6 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold text-sm">{editingId ? 'Modifica' : 'Nuova Location'}</h3>
          <input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            required placeholder="Nome *" className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input type="text" value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
            placeholder="Indirizzo (opzionale)" className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 text-sm">{editingId ? 'Salva' : 'Aggiungi'}</button>
            <button type="button" onClick={cancel} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 text-sm">Annulla</button>
          </div>
        </form>
      )}
      {loading ? <p className="text-gray-400">Caricamento...</p>
        : locations.length === 0 ? <p className="text-gray-400 text-sm">Nessuna location. Aggiungine una!</p>
        : <ul className="divide-y">{locations.map((loc) => (
          <li key={loc.id} className="py-3 flex justify-between items-start">
            <div><div className="font-medium">{loc.name}</div>{loc.address && <div className="text-sm text-gray-500">{loc.address}</div>}</div>
            <button onClick={() => startEdit(loc)} className="text-sm text-indigo-600 hover:underline ml-4 shrink-0">✏️ Modifica</button>
          </li>
        ))}</ul>
      }
    </div>
  );
}

// ── AdminPage ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [tab, setTab] = useState('turni');
  const [locations, setLocations] = useState([]);

  useEffect(() => { locationsAPI.getLocations().then((r) => setLocations(r.data)).catch(() => {}); }, []);

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ Accesso negato</h1>
          <button onClick={() => navigate('/dashboard')} className="bg-indigo-600 text-white px-4 py-2 rounded">Dashboard</button>
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
          <button onClick={() => navigate('/dashboard')} className="text-indigo-600 hover:underline text-sm">← Dashboard</button>
        </div>
        <div className="max-w-5xl mx-auto px-4 flex gap-1 border-t overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
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
