import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shiftsAPI } from '../services/api';

export default function AdminPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    location_id: '1',
    start_time: '',
    end_time: '',
    required_count: 1,
  });

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ Access Denied</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-indigo-600 text-white px-4 py-2 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

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
      await shiftsAPI.createShift(formData);
      alert('✅ Shift created!');
      setShowForm(false);
      setFormData({
        location_id: '1',
        start_time: '',
        end_time: '',
        required_count: 1,
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create shift');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">👨‍💼 Admin Dashboard</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-indigo-600 hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">📅 Manage Shifts</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              {showForm ? '❌ Cancel' : '➕ Create Shift'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 bg-gray-50 rounded">
              <div>
                <label className="block text-sm font-semibold mb-1">Location ID</label>
                <input
                  type="number"
                  name="location_id"
                  value={formData.location_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Required Volunteers</label>
                <input
                  type="number"
                  name="required_count"
                  min="1"
                  value={formData.required_count}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700"
              >
                Create Shift
              </button>
            </form>
          )}

          <div className="text-center text-gray-500">
            <p>Shift management features coming soon...</p>
            <p className="text-sm mt-2">View coverage status, uncovered shifts, and contact volunteers</p>
          </div>
        </div>
      </main>
    </div>
  );
}
