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
    start_time: '',
    end_time: '',
    required_count: 1,
  });

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Accesso negato</h1>
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

  useEffect(() => {
    loadShifts();
  }, []);

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
      [name]: name === 'required_count' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await shiftsAPI.createShift({
        location_id: 1,
        title: formData.title,
        start_time: formData.start_time,
        end_time: formData.end_time,
        required_count: formData.required_count,
      });
      alert('Turno creato!');
      setShowForm(false);
      setFormData({ title: '', start_time: '', end_time: '', required_count: 1 });
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
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              {showForm ? 'Annulla' : '+ Nuovo Turno'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
            >
              Dashboard
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Crea Nuovo Turno</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2"
                  placeholder="Es. Turno mattina - Piazza Garibaldi"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inizio</label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fine</label>
                  <input
                    type="datetime-local"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volontari necessari
                </label>
                <input
                  type="number"
                  name="required_count"
                  value={formData.required_count}
                  onChange={handleChange}
                  min="1"
                  required
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-semibold"
              >
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
                <div
                  key={shift.id}
                  className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-semibold text-lg">
                      {shift.location_name || shift.title || 'Turno'}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Inizio: {new Date(shift.start_time).toLocaleString('it-IT')}
                    </p>
                    <p className="text-gray-600 text-sm">
                      Fine: {new Date(shift.end_time).toLocaleString('it-IT')}
                    </p>
                    <p className="text-sm mt-1">
                      <span
                        className={`font-semibold ${
                          shift.assigned_count >= shift.required_count
                            ? 'text-green-600'
                            : 'text-orange-500'
                        }`}
                      >
                        {shift.assigned_count}/{shift.required_count}
                      </span>{' '}
                      volontari
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(shift.id)}
                    className="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 font-semibold"
                  >
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
