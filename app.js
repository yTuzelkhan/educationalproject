/* ── Task Manager — app.js ── */
'use strict';

// ── State ────────────────────────────────────────────────────────────────────
let tasks   = JSON.parse(localStorage.getItem('tm_tasks') || '[]');
let nextId  = parseInt(localStorage.getItem('tm_nid') || '1', 10);
let editId  = null;          // null = add mode, number = edit mode
let deleteId = null;         // pending delete

const filter = { q: '', priority: 'all', category: 'all', status: 'all' };

// Seed demo tasks on first load
if (!tasks.length) {
  const d = n => {
    const x = new Date();
    x.setDate(x.getDate() + n);
    return x.toISOString().split('T')[0];
  };
  tasks = [
    { id: 1, title: 'Review Q2 project report',        priority: 'high',   category: 'Work',     due: d(-1), notes: 'Check financials section', done: false },
    { id: 2, title: 'Schedule dentist appointment',    priority: 'medium', category: 'Health',   due: d(3),  notes: '',                         done: false },
    { id: 3, title: 'Read "Atomic Habits" chapter 5',  priority: 'low',    category: 'Learning', due: d(7),  notes: '',                         done: true  },
    { id: 4, title: 'Pay electricity bill',            priority: 'high',   category: 'Finance',  due: d(2),  notes: '',                         done: false },
    { id: 5, title: '30-min morning run',              priority: 'medium', category: 'Health',   due: d(0),  notes: '',                         done: false },
  ];
  nextId = 6;
  save();
}

// ── Persistence ───────────────────────────────────────────────────────────────
function save() {
  localStorage.setItem('tm_tasks', JSON.stringify(tasks));
  localStorage.setItem('tm_nid', nextId);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isOverdue(task) {
  if (task.done || !task.due) return false;
  return new Date(task.due) < new Date(new Date().toDateString());
}

function formatDate(str) {
  if (!str) return '';
  const dt   = new Date(str + 'T00:00:00');
  const now  = new Date(new Date().toDateString());
  const diff = Math.round((dt - now) / 86400000);
  if (diff === 0)  return 'Today';
  if (diff === 1)  return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0)   return `${Math.abs(diff)}d overdue`;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapedHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// SVG icons (inline for zero dependency)
const ICONS = {
  edit:
    `<svg viewBox="0 0 20 20" fill="none"><path d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  trash:
    `<svg viewBox="0 0 20 20" fill="none"><path d="M4 6h12M8 6V4h4v2M7 6l1 10h4l1-10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  check:
    `<svg viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  empty:
    `<svg viewBox="0 0 48 48" fill="none"><rect x="8" y="12" width="32" height="28" rx="4" stroke="currentColor" stroke-width="2"/><path d="M16 22h16M16 30h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 8h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
};

// ── Filter & sort tasks ───────────────────────────────────────────────────────
function getFiltered() {
  const q = filter.q.trim().toLowerCase();
  return tasks
    .filter(t => {
      if (filter.status === 'active' && t.done)  return false;
      if (filter.status === 'done'   && !t.done) return false;
      if (filter.priority !== 'all' && t.priority !== filter.priority) return false;
      if (filter.category !== 'all' && t.category !== filter.category) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.notes.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      // Active before done
      if (!a.done && b.done) return -1;
      if (a.done && !b.done) return 1;
      // Then by priority
      const p = { high: 0, medium: 1, low: 2 };
      if (p[a.priority] !== p[b.priority]) return p[a.priority] - p[b.priority];
      // Then by due date
      if (a.due && b.due) return a.due.localeCompare(b.due);
      if (a.due)  return -1;
      if (b.due)  return 1;
      return 0;
    });
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  const list = getFiltered();
  const el   = document.getElementById('taskList');

  if (!list.length) {
    el.innerHTML = `
      <div class="empty-state">
        ${ICONS.empty}
        <p>${filter.q || filter.priority !== 'all' || filter.category !== 'all' || filter.status !== 'all'
          ? 'No tasks match your filters.'
          : 'No tasks yet. Hit <strong>Add Task</strong> to get started!'}</p>
      </div>`;
  } else {
    el.innerHTML = list.map(t => {
      const over = isOverdue(t);
      const dateLabel = t.due ? `<span class="due-label${over ? ' overdue' : ''}">📅 ${formatDate(t.due)}</span>` : '';
      return `
      <div class="task-card${t.done ? ' done' : ''}" data-id="${t.id}">
        <button class="check-btn${t.done ? ' checked' : ''}" data-action="toggle" data-id="${t.id}" aria-label="${t.done ? 'Mark incomplete' : 'Mark complete'}" title="${t.done ? 'Mark incomplete' : 'Mark complete'}">
          ${t.done ? ICONS.check : ''}
        </button>
        <div class="task-body">
          <div class="task-title">${escapedHtml(t.title)}</div>
          ${t.notes ? `<div class="task-notes">${escapedHtml(t.notes)}</div>` : ''}
          <div class="task-meta">
            <span class="badge badge-${t.priority}">${t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}</span>
            <span class="badge badge-cat">${escapedHtml(t.category)}</span>
            ${dateLabel}
          </div>
        </div>
        <div class="task-actions">
          <button class="icon-btn" data-action="edit"   data-id="${t.id}" aria-label="Edit task"   title="Edit">${ICONS.edit}</button>
          <button class="icon-btn delete" data-action="delete" data-id="${t.id}" aria-label="Delete task" title="Delete">${ICONS.trash}</button>
        </div>
      </div>`;
    }).join('');
  }

  // Stats
  const total = tasks.length;
  const done  = tasks.filter(t => t.done).length;
  const over  = tasks.filter(isOverdue).length;
  document.getElementById('statsBar').innerHTML =
    `<span><strong>${total}</strong> total</span>` +
    `<span><strong>${done}</strong> completed</span>` +
    `<span><strong>${total - done}</strong> remaining</span>` +
    (over ? `<span style="color:#DC2626"><strong>${over}</strong> overdue</span>` : '');

  // Update pill counts
  document.querySelectorAll('.pill').forEach(pill => {
    const s = pill.dataset.status;
    const counts = { all: total, active: total - done, done };
    pill.textContent = `${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s]})`;
    if (filter.status === s) pill.classList.add('active');
    else                     pill.classList.remove('active');
  });
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function openModal(task) {
  editId = task ? task.id : null;
  const titleEl = document.getElementById('modalTitle');
  const saveBtn = document.getElementById('btnSave');

  titleEl.textContent = task ? 'Edit Task' : 'Add Task';
  saveBtn.textContent = task ? 'Save Changes' : 'Add Task';

  document.getElementById('fTitle').value    = task ? task.title    : '';
  document.getElementById('fPriority').value = task ? task.priority : 'medium';
  document.getElementById('fCategory').value = task ? task.category : 'Work';
  document.getElementById('fDue').value      = task ? task.due      : '';
  document.getElementById('fNotes').value    = task ? task.notes    : '';

  document.getElementById('titleError').classList.add('hidden');
  document.getElementById('modalBackdrop').classList.remove('hidden');
  document.getElementById('fTitle').focus();
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.add('hidden');
  editId = null;
}

function saveTask() {
  const title = document.getElementById('fTitle').value.trim();
  if (!title) {
    document.getElementById('titleError').classList.remove('hidden');
    document.getElementById('fTitle').focus();
    return;
  }
  document.getElementById('titleError').classList.add('hidden');

  const data = {
    title,
    priority: document.getElementById('fPriority').value,
    category: document.getElementById('fCategory').value,
    due:      document.getElementById('fDue').value,
    notes:    document.getElementById('fNotes').value.trim(),
  };

  if (editId !== null) {
    const idx = tasks.findIndex(t => t.id === editId);
    if (idx > -1) tasks[idx] = { ...tasks[idx], ...data };
  } else {
    tasks.push({ id: nextId++, done: false, ...data });
  }

  save();
  closeModal();
  render();
}

// ── Confirm delete ────────────────────────────────────────────────────────────
function openConfirm(id) {
  deleteId = id;
  document.getElementById('confirmBackdrop').classList.remove('hidden');
}
function closeConfirm() {
  document.getElementById('confirmBackdrop').classList.add('hidden');
  deleteId = null;
}
function confirmDelete() {
  if (deleteId !== null) {
    tasks = tasks.filter(t => t.id !== deleteId);
    save();
    render();
  }
  closeConfirm();
}

// ── Event delegation on task list ─────────────────────────────────────────────
document.getElementById('taskList').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id     = parseInt(btn.dataset.id, 10);
  const action = btn.dataset.action;

  if (action === 'toggle') {
    const t = tasks.find(x => x.id === id);
    if (t) { t.done = !t.done; save(); render(); }
  } else if (action === 'edit') {
    openModal(tasks.find(x => x.id === id));
  } else if (action === 'delete') {
    openConfirm(id);
  }
});

// ── Toolbar / filter events ───────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', e => {
  filter.q = e.target.value;
  render();
});

document.getElementById('filterPriority').addEventListener('change', e => {
  filter.priority = e.target.value;
  render();
});

document.getElementById('filterCategory').addEventListener('change', e => {
  filter.category = e.target.value;
  render();
});

document.getElementById('pillsBar').addEventListener('click', e => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  filter.status = pill.dataset.status;
  render();
});

// ── Modal button events ───────────────────────────────────────────────────────
document.getElementById('btnAdd').addEventListener('click',    () => openModal(null));
document.getElementById('btnCancel').addEventListener('click',  closeModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('btnSave').addEventListener('click',    saveTask);

document.getElementById('confirmNo').addEventListener('click',  closeConfirm);
document.getElementById('confirmYes').addEventListener('click', confirmDelete);

// Close modal on backdrop click
document.getElementById('modalBackdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('modalBackdrop')) closeModal();
});
document.getElementById('confirmBackdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('confirmBackdrop')) closeConfirm();
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeConfirm();
  }
  if (e.key === 'Enter' && !document.getElementById('modalBackdrop').classList.contains('hidden')) {
    const focused = document.activeElement?.tagName;
    if (focused !== 'BUTTON' && focused !== 'TEXTAREA') saveTask();
  }
});

// ── Initial render ────────────────────────────────────────────────────────────
render();
