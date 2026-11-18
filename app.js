/* Mini Lead Tracker: all app logic (data, storage, rendering, events). */
(function () {
  'use strict';

  // ===== Config =====
  const STORAGE_KEY = 'miniLeadTracker.leads';

  // The 5 stages, in board order. Colors match the CSS variables.
  const STAGES = [
    { id: 'new', label: 'New', color: 'var(--stage-new)' },
    { id: 'contacted', label: 'Contacted', color: 'var(--stage-contacted)' },
    { id: 'interested', label: 'Interested', color: 'var(--stage-interested)' },
    { id: 'won', label: 'Won', color: 'var(--stage-won)' },
    { id: 'lost', label: 'Lost', color: 'var(--stage-lost)' }
  ];
  const STAGE_IDS = STAGES.map(function (s) { return s.id; });
  const SOURCES = ['LinkedIn', 'Website'];

  // ===== DOM references =====
  const form = document.getElementById('lead-form');
  const formTitle = document.getElementById('form-title');
  const idInput = document.getElementById('lead-id');
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const board = document.getElementById('board');
  const totalEl = document.getElementById('count-total');
  const stageStatsEl = document.getElementById('stage-stats');
  // Form inputs, looked up by id
  const fields = {
    name: document.getElementById('name'),
    company: document.getElementById('company'),
    phone: document.getElementById('phone'),
    source: document.getElementById('source'),
    notes: document.getElementById('notes')
  };

  // ===== State =====
  let leads = loadLeads();

  // ===== Storage helpers =====
  // Read leads from localStorage; fall back to an empty list if missing or broken.
  function loadLeads() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data.filter(isValidLead) : [];
    } catch (e) {
      return [];
    }
  }

  // Write the current leads list to localStorage.
  function saveLeads() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    } catch (e) {
      alert('Could not save to browser storage. Changes may be lost on refresh.');
    }
  }

  // Basic shape check so corrupted saved data cannot break rendering.
  function isValidLead(l) {
    return l && typeof l.id === 'string' && typeof l.name === 'string' && STAGE_IDS.indexOf(l.stage) !== -1;
  }

  // Unique id for each lead.
  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ===== Rendering =====
  // Re-draw counts and the board from the leads array.
  function render() {
    renderStats();
    renderBoard();
  }

  // Top bar: total + one badge per stage.
  function renderStats() {
    totalEl.textContent = leads.length;
    stageStatsEl.innerHTML = '';
    STAGES.forEach(function (stage) {
      const badge = el('div', 'stat');
      badge.style.setProperty('--accent', stage.color);
      badge.append(el('span', 'dot'), el('span', 'stat-label', stage.label), el('span', 'stat-value', String(countIn(stage.id))));
      stageStatsEl.appendChild(badge);
    });
  }

  // Board: one column per stage, each with its cards (newest first).
  function renderBoard() {
    board.innerHTML = '';
    STAGES.forEach(function (stage) {
      const column = el('div', 'column');
      column.style.setProperty('--accent', stage.color);

      const header = el('div', 'column-header');
      header.append(el('span', 'dot'), el('h3', '', stage.label), el('span', 'column-count', String(countIn(stage.id))));
      column.appendChild(header);

      const list = el('div', 'cards');
      const stageLeads = leads
        .filter(function (l) { return l.stage === stage.id; })
        .sort(function (a, b) { return b.createdAt - a.createdAt; });

      if (stageLeads.length === 0) {
        list.appendChild(el('p', 'empty', 'No leads yet'));
      } else {
        stageLeads.forEach(function (lead) { list.appendChild(renderCard(lead)); });
      }

      column.appendChild(list);
      board.appendChild(column);
    });
  }

  // A single lead card. User text is set with textContent (safe from HTML injection).
  function renderCard(lead) {
    const card = el('article', 'card');
    card.dataset.id = lead.id;
    if (idInput.value === lead.id) card.classList.add('editing');

    card.appendChild(el('h4', 'card-title', lead.name));
    card.appendChild(el('div', 'card-company', lead.company));

    if (lead.phone) {
      const phone = el('a', 'card-phone', lead.phone);
      phone.href = 'tel:' + lead.phone.replace(/[^\d+]/g, '');
      card.appendChild(phone);
    }

    card.appendChild(el('span', 'tag tag-' + lead.source.toLowerCase(), lead.source));

    if (lead.notes) card.appendChild(el('p', 'card-notes', lead.notes));

    // Actions: move dropdown, edit, delete
    const actions = el('div', 'card-actions');

    const move = el('select');
    move.dataset.action = 'move';
    move.setAttribute('aria-label', 'Move ' + lead.name + ' to stage');
    STAGES.forEach(function (s) {
      const opt = el('option', '', s.id === lead.stage ? s.label + ' (current)' : 'Move to ' + s.label);
      opt.value = s.id;
      opt.selected = s.id === lead.stage;
      move.appendChild(opt);
    });

    const editBtn = el('button', 'btn btn-ghost btn-sm', 'Edit');
    editBtn.type = 'button';
    editBtn.dataset.action = 'edit';

    const delBtn = el('button', 'btn btn-ghost btn-sm btn-danger', 'Delete');
    delBtn.type = 'button';
    delBtn.dataset.action = 'delete';

    actions.append(move, editBtn, delBtn);
    card.appendChild(actions);
    return card;
  }

  // Small helper to create an element with a class and optional text.
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function countIn(stageId) {
    return leads.filter(function (l) { return l.stage === stageId; }).length;
  }

  // ===== Form: validation =====
  // Returns the cleaned form values, or null if invalid (and shows error messages).
  function readForm() {
    const values = {
      name: fields.name.value.trim(),
      company: fields.company.value.trim(),
      phone: fields.phone.value.trim(),
      source: SOURCES.indexOf(fields.source.value) !== -1 ? fields.source.value : SOURCES[0],
      notes: fields.notes.value.trim()
    };

    const errors = {};
    if (!values.name) errors.name = 'Name is required.';
    if (!values.company) errors.company = 'Company is required.';
    // Phone is optional; if given, allow digits, spaces, +, -, ( ) and need at least 7 digits.
    if (values.phone && (!/^[\d\s+\-().]+$/.test(values.phone) || values.phone.replace(/\D/g, '').length < 7)) {
      errors.phone = 'Enter a valid phone number.';
    }

    ['name', 'company', 'phone'].forEach(function (field) {
      fields[field].classList.toggle('invalid', Boolean(errors[field]));
      form.querySelector('[data-error-for="' + field + '"]').textContent = errors[field] || '';
    });

    const firstError = Object.keys(errors)[0];
    if (firstError) {
      fields[firstError].focus();
      return null;
    }
    return values;
  }

  // Clear errors and switch the form back to "Add" mode.
  function resetForm() {
    form.reset();
    idInput.value = '';
    form.querySelectorAll('.invalid').forEach(function (i) { i.classList.remove('invalid'); });
    form.querySelectorAll('.error').forEach(function (e) { e.textContent = ''; });
    formTitle.textContent = 'Add a lead';
    submitBtn.textContent = 'Add lead';
    cancelBtn.hidden = true;
  }

  // Load a lead into the form and switch to "Edit" mode.
  function startEdit(lead) {
    resetForm();
    idInput.value = lead.id;
    fields.name.value = lead.name;
    fields.company.value = lead.company;
    fields.phone.value = lead.phone;
    fields.source.value = lead.source;
    fields.notes.value = lead.notes;
    formTitle.textContent = 'Edit lead';
    submitBtn.textContent = 'Save changes';
    cancelBtn.hidden = false;
    render();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    fields.name.focus({ preventScroll: true });
  }

  // ===== Event handlers =====
  // Add a new lead, or save edits to an existing one.
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const values = readForm();
    if (!values) return;

    const editingId = idInput.value;
    if (editingId) {
      const lead = findLead(editingId);
      if (lead) Object.assign(lead, values);
    } else {
      leads.push(Object.assign({ id: makeId(), stage: 'new', createdAt: Date.now() }, values));
    }

    saveLeads();
    resetForm();
    render();
  });

  cancelBtn.addEventListener('click', function () {
    resetForm();
    render();
  });

  // One click listener for every card's Edit / Delete buttons (event delegation).
  board.addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const lead = findLead(btn.closest('.card').dataset.id);
    if (!lead) return;

    if (btn.dataset.action === 'edit') {
      startEdit(lead);
    } else if (btn.dataset.action === 'delete') {
      if (!confirm('Delete lead "' + lead.name + '"? This cannot be undone.')) return;
      leads = leads.filter(function (l) { return l.id !== lead.id; });
      if (idInput.value === lead.id) resetForm();
      saveLeads();
      render();
    }
  });

  // One change listener for every card's "Move to" dropdown.
  board.addEventListener('change', function (e) {
    if (e.target.dataset.action !== 'move') return;
    const lead = findLead(e.target.closest('.card').dataset.id);
    if (!lead || STAGE_IDS.indexOf(e.target.value) === -1) return;
    lead.stage = e.target.value;
    saveLeads();
    render();
  });

  // Keep multiple open tabs in sync when another tab changes the data.
  window.addEventListener('storage', function (e) {
    if (e.key !== STORAGE_KEY) return;
    leads = loadLeads();
    if (idInput.value && !findLead(idInput.value)) resetForm();
    render();
  });

  function findLead(id) {
    return leads.find(function (l) { return l.id === id; });
  }

  // ===== Start =====
  render();
})();
