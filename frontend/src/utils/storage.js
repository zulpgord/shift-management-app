// localStorage can hold leftover or corrupted values: never let a bad read crash a render
export function getStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    localStorage.removeItem('user');
    return {};
  }
}

export function clearSession() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch {
    // nothing we can do if storage is unavailable
  }
}
