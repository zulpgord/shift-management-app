import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shiftsAPI, usersAPI } from '../services/api';

const LOCATIONS = ['Alveare Urbano', 'Leila', 'Magma', 'Scamamù', 'Ribalta'];

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

const emptyForm = { location: LOCATIONS[0], date: '', start_hour: '09:00', duration_hours: 2, required_count: 1, repeat: false, repeat_weeks: 4 };

export default function AdminPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [activeTab, setActiveTab] = useState('turni');
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Accesso negato</h1>
          <button onClick={() => navigate('/dashboard')} className="bg-indigo-600 text-white px-4 py-2 rounded">
            Torna alla Dashboard
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => { loadShifts(); }, []);
  useEffect(() => { if (activeTab === 'utenti') loadUsers(); }, [activeTab]);

  const loadShifts = async () => {
    try {
      setLoadingShifts(true);
      const res = await shiftsAPI.getShifts();
      setShifts(res.data);
    } catch (err) { console.error('Failed to load shifts', err); }
    finally { setLoadingShifts(false); }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await usersAPI.getUsers();
      setUsers(res.data);
    } catch (err) { console.error('Failed to load users', err); }
    finally { setLoadingUsers(false); }
  };

  const handleRoleToggle = async (u) => {
    const newRole = u.role === 'admin' ? 'volunteer' : 'admin';
    if (u.id === user.id && newRole === 'volunteer') {
      alert('Non puoi rimuovere il tuo ruolo di admin');
      return;
    }
    try {
      await usersAPI.updateUserRole(u.id, newRole);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x));
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nel cambio ruolo');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'required_count' || name === 'duration_hours' || name === 'repeat_weeks') ? parseInt(value) : value,
    }));
  };

  const openCreate = () => { setEditingId(null); setFormData(emptyForm); setShowForm(true); };

  const openEdit = (shift) => {
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    const pad = (n) => String(n).padStart(2, '0');
    setFormData({
      location: shift.location_name || LOCATIONS[0],
      date: `${start.getFullYear()}-${pad(start.getMonth()+1)}-${pad(start.getDate())}`,
      start_hour: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      duration_hours: Math.round((end - start) / 3600000) || 2,
      required_count: shift.required_count,
      repeat: false, repeat_weeks: 4,
    });
    setEditingId(shift.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => { setShowForm(false); setEditingId(null); setFormData(emptyForm); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const startDateTime = new Date(formData.date + 'T' + formData.start_hour + ':00');
    const endDateTime = new Date(startDateTime.getTime() + formData.duration_hours * 3600000);
    const payload = { title: formData.location, start_time: startDateTime.toISOString(), end_time: endDateTime.toISOString(), required_count: formData.required_count };
    try {
      if (editingId) {
        await shiftsAPI.updateShift(editingId, payload);
        alert('Turno aggiornato!');
      } else if (formData.repeat && formData.repeat_weeks > 1) {
        for (let i = 0; i < formData.repeat_weeks; i++) {
          const start = new Date(startDateTime.getTime() + i * 7 * 24 * 3600000);
          const end = new Date(endDateTime.getTime() + i * 7 * 24 * 3600000);
          await shiftsAPI.createShift({ ...payload, start_time: start.toISOString(), end_time: end.toISOString() });
        }
        alert(`${formData.repeat_weeks} turni creati!`);
      } else {
        await shiftsAPI.createShift(payload);
        alert('Turno creato!');
      }
      handleCancel();
      loadShifts();
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nel salvataggio del turno');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo turno?')) return;
    try {
      await shiftsAPI.deleteShift(id);
      setShifts(prev => prev.filter(s => s.id !== id));
    } catch (err) { alert(err.response?.data?.error || 'Errore nella cancellazione'); }
  };

  const endTime = formData.date && formData.start_hour ? (() => {
    const end = new Date(formData.date + 'T' + formData.start_hour + ':00');
    end.setHours(end.getHours() + formData.duration_hours);
    return end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  })() : null;

  const tabBtn = (id, label) => (
    <button onClick={() => setActiveTab(id)}
      className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${activeTab === id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <LeilaLogo />
        <div className="flex gap-3">
          {activeTab === 'turni' && (
            <button onClick={openCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm">
              + Nuovo Turno
            </button>
          )}
          <button onClick={() => navigate('/dashboard')} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
            ← Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Pannello Admin</h1>

        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {tabBtn('turni', '📅 Turni')}
          {tabBtn('utenti', '👥 Utenti')}
        </div>

        {activeTab === 'turni' && (
          <>
            {showForm && (
              <div className="bg-white rounded-xl shadow-md p-6 mb-6 border-l-4 border-indigo-500">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">
                  {editingId ? '✏️ Modifica Turno' : '+ Crea Nuovo Turno'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <select name="location" value={formData.location} onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                      <input type="date" name="date" value={formData.date} onChange={handleChange} required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ora inizio</label>
                      <input type="time" name="start_hour" value={formData.start_hour} onChange={handleChange} required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Durata</label>
                      <select name="duration_hours" value={formData.duration_hours} onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h} {h === 1 ? 'ora' : 'ore'}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Volontari necessari</label>
                      <input type="number" name="required_count" value={formData.required_count} onChange={handleChange} min="1" required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                  {endTime && (
                    <p className="text-sm bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg">
                      Orario turno: <strong>{formData.start_hour}</strong> — <strong>{endTime}</strong>
                    </p>
                  )}
                  {!editingId && (
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="repeat" checked={formData.repeat} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded" />
                        <span className="text-sm font-medium text-gray-700">Turno ripetitivo settimanale</span>
                      </label>
                      {formData.repeat && (
                        <div className="mt-3 flex items-center gap-3">
                          <label className="text-sm text-gray-600">Ripeti per</label>
                          <input type="number" name="repeat_weeks" value={formData.repeat_weeks} onChange={handleChange} min="2" max="52"
                            className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <span className="text-sm text-gray-600">settimane</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button type="submit" disabled={submitting}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50">
                      {submitting ? 'Salvataggio...' : editingId ? 'Salva Modifiche' : formData.repeat ? `Crea ${formData.repeat_weeks} Turni` : 'Crea Turno'}
                    </button>
                    <button type="button" onClick={handleCancel}
                      className="px-6 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200">
                      Annulla
                    </button>
                  </div>
                </form>
              </div>
            )}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Turni in Calendario</h2>
              {loadingShifts ? (
                <p className="text-gray-400 text-center py-8">Caricamento...</p>
              ) : shifts.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Nessun turno presente. Creane uno!</p>
              ) : (
                <div className="space-y-3">
                  {shifts.map(shift => (
                    <div key={shift.id} className="border border-gray-200 rounded-xl p-4 flex justify-between items-center hover:border-indigo-300 transition-colors">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 text-base">{shift.location_name || 'Turno'}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${shift.assigned_count >= shift.required_count ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {shift.assigned_count}/{shift.required_count} volontari
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm">
                          {new Date(shift.start_time).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {new Date(shift.start_time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} —{' '}
                          {new Date(shift.end_time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(shift)} className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 text-sm font-medium">Modifica</button>
                        <button onClick={() => handleDelete(shift.id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 text-sm font-medium">Elimina</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'utenti' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Gestione Utenti</h2>
            {loadingUsers ? (
              <p className="text-gray-400 text-center py-8">Caricamento...</p>
            ) : users.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nessun utente registrato.</p>
            ) : (
              <div className="space-y-3">
                {users.map(u => (
                  <div key={u.id} className="border border-gray-200 rounded-xl p-4 flex justify-between items-center hover:border-gray-300 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{u.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                          {u.role === 'admin' ? '⭐ Admin' : 'Volontario'}
                        </span>
                        {u.id === user.id && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Tu</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm mt-0.5">{u.email}</p>
                    </div>
                    <button onClick={() => handleRoleToggle(u)} disabled={u.id === user.id}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${u.id === user.id ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400' : u.role === 'admin' ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
                      {u.role === 'admin' ? 'Rimuovi Admin' : 'Rendi Admin'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
