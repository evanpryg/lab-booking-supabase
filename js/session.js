// Status sesi aplikasi (dibagikan antar modul)
export const S = {
  admin: null,           // Supabase session object (admin)
  guru: null,            // { id, nama } dari localStorage (guru)
};

const KEY = 'lab.guru';

export function loadGuru() {
  try { S.guru = JSON.parse(localStorage.getItem(KEY)) || null; } catch { S.guru = null; }
  return S.guru;
}
export function setGuru(g) {
  S.guru = g;
  localStorage.setItem(KEY, JSON.stringify(g));
}
export function clearGuru() {
  S.guru = null;
  localStorage.removeItem(KEY);
}
