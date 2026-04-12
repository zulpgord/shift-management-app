import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shiftsAPI } from '../services/api';

export default function AdminPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    start_hour: '09:00',
    duration_hours: 2,
    required_count: 1,
  });

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

  const loadShifts = async () => {
    try {
      setLoading(true);
      const res = await shiftsAPI.getShifts();
      setShifts(res.data);
    } catch (err) {
      console.error('Failed to load shifts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: (name === 'required_count' || name === 'duration_hours') ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const startDateTime = new Date(formData.date + 'T' + formData.start_hour + ':00');
      const endDateTime = new Date(startDateTime.getTime() + formData.duration_hours * 60 * 60 * 1000);
      await shiftsAPI.createShift({
        title: formData.title,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        required_count: formData.required_count,
      });
      alert('Turno creato!');
      setShowForm(false);
      setFormData({ title: '', date: '', start_hour: '09:00', duration_hours: 2, required_count: 1 });
      loadShifts();
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nella creazione del turno');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo turno?')) return;
    try {
      await shiftsAPI.deleteShift(id);
      setShifts((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nella cancellazione');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Gestione Turni</h1>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
              {showForm ? 'Annulla' : '+ Nuovo Turno'}
            </button>
            <button onClick={() => navigate('/dashboard')} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
              Dashboard
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Crea Nuovo Turno</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titolo / Luogo</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} required
                  className="w-full border rounded px-3 py-2" placeholder="Es. Alveare Urbano - Piazza Garibaldi" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} required
                    className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ora inizio</label>
                  <input type="time" name="start_hour" value={formData.start_hour} onChange={handleChange} required
                    className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durata (ore)</label>
                  <select name="duration_hours" value={formData.duration_hours} onChange={handleChange}
                    className="w-full border rounded px-3 py-2">
                    {[1,2,3,4,5,6,7,8].map(h => (
                      <option key={h} value={h}>{h} {h === 1 ? 'ora' : 'ore'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volontari necessari</label>
                  <input type="number" name="required_count" value={formData.required_count} onChange={handleChange}
                    min="1" required className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              {formData.date && formData.start_hour && (
                <p className="text-sm text-gray-500">
                  Orario: {formData.start_hour} — {
                    (() => {
                      const end = new Date(formData.date + 'T' + formData.start_hour + ':00');
                      end.setHours(end.getHours() + formData.duration_hours);
                      return end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                    })()
                  }
                </p>
              )}
              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-semibold">
                Crea Turno
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Turni Esistenti</h2>
          {loading ? (
            <p className="text-gray-500">Caricamento...</p>
          ) : shifts.length === 0 ? (
            <p className="text-gray-500">Nessun turno presente. Creane uno!</p>
          ) : (
            <div className="space-y-3">
              {shifts.map((shift) => (
                <div key={shift.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">{shift.location_name || shift.title || 'Turno'}</h3>
                    <p className="text-gray-600 text-sm">
                      {new Date(shift.start_time).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {new Date(shift.start_time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} —{' '}
                      {new Date(shift.end_time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-sm mt-1">
                      <span className={`font-semibold ${shift.assigned_count >= shift.required_count ? 'text-green-600' : 'text-orange-500'}`}>
                        {shift.assigned_count}/{shift.required_count}
                      </span>{' '}volontari
                    </p>
                  </div>
                  <button onClick={() => handleDelete(shift.id)}
                    className="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 font-semibold">
                    Elimina
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
