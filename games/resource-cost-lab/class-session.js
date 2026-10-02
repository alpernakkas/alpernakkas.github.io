import {classes, revision} from './class-codes.js';

const key = 'resource-cost-lab.class-session';

export function currentClass() {
  try {
    const session = JSON.parse(sessionStorage.getItem(key));
    if (!session || session.revision !== revision) return null;
    return classes.find(item => item.enabled && item.id === session.classId) || null;
  } catch {
    return null;
  }
}

export function joinClass(code) {
  const selected = classes.find(item => item.enabled && item.code === code.trim());
  if (!selected) return false;
  sessionStorage.setItem(key, JSON.stringify({classId: selected.id, revision}));
  return true;
}

export function leaveClass() {
  try { sessionStorage.removeItem(key); } catch { /* Leaving still returns to login. */ }
}
