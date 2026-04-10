import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shiftsAPI, assignmentsAPI } from '../services/api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [shifts, setShifts] = useState([]);
  const [userAssignments, setUserAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ location: 'all', date: '' });

  useEffect(() => {
    if (!user.id) {
      navigate('/auth');
      return;
    }
    loadShifts();
  }, [filter]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const [shiftsRes, assignmentsRes] = await Promise.all([
        shiftsAPI.getShifts(filter.location !== 'all' ? { location_id: filter.location } : {}),
        assignmentsAPI.getUserAssignments(),
      ]);
      setShifts(shiftsRes.data);
      setUserAssignments(assignmentsRes.data);
    } catch (err) {
      setError('Failed to load shifts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (shiftId) => {
    try {
      await assignmentsAPI.assignShift(shiftId);
      alert('✅ Assigned to shift!');
      loadShifts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign');
    }
  };

  const handleCancel = async (assignmentId) => {
    if (window.confirm('Are you sure you want to cancel?')) {
      try {
        await assignmentsAPI.cancelAssignment(assignmentId);
        alert('❌ Cancelled');
        loadShifts();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to cancel');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">📅 Shift Manager</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">{user.name}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-4">
        {user.role === 'admin' && (
          <div className="mb-4">
            <button
              onClick={() => navigate('/admin')}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              📊 Admin Dashboard
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Available Shifts</p>
            <p className="text-3xl font-bold text-indigo-600">{shifts.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Your Assignments</p>
            <p className="text-3xl font-bold text-green-600">
              {userAssignments.filter(a => a.status === 'assigned').length}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <h2 className="text-xl font-bold mb-4">📍 Available Shifts</h2>
              {shifts.length === 0 ? (
                <p className="text-gray-500">No shifts available</p>
              ) : (
                <div className="space-y-3">
                  {shifts.map((shift) => {
                    const isAssigned = userAssignments.some(
                      (a) => a.shift_id === shift.id && a.status === 'assigned'
                    );
                    return (
                      <div
                        key={shift.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{shift.location_name}</h3>
                            <p className="text-gray-600 text-sm">
                              {new Date(shift.start_time).toLocaleString()}
                            </p>
                            <p className="text-gray-500 text-sm mt-1">
                              Coverage: {shift.assigned_count}/{shift.required_count}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAssign(shift.id)}
                            disabled={isAssigned}
                            className={`px-4 py-2 rounded font-semibold ${
                              isAssigned
                                ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >
                            {isAssigned ? '✅ Assigned' : '➕ Join'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-bold mb-4">📋 Your Assignments</h2>
              {userAssignments.length === 0 ? (
                <p className="text-gray-500">No assignments yet</p>
              ) : (
                <div className="space-y-3">
                  {userAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold">{assignment.location_name}</h3>
                          <p className="text-gray-600 text-sm">
                            {new Date(assignment.start_time).toLocaleString()}
                          </p>
                          <span
                            className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${
                              assignment.status === 'assigned'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {assignment.status}
                          </span>
                        </div>
                        {assignment.status === 'assigned' && (
                          <button
                            onClick={() => handleCancel(assignment.id)}
                            className="text-red-500 hover:text-red-700 font-semibold"
                          >
                            ❌ Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
