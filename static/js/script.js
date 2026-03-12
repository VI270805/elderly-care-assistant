// ===== CREDENTIALS =====
const VALID_USER = 'admin';
const VALID_PASS = '1234';

// ===== LOGIN =====
function handleLogin() {
  const user    = document.getElementById('login-user').value.trim();
  const pass    = document.getElementById('login-pass').value;
  const errBox  = document.getElementById('login-error');
  const errMsg  = document.getElementById('login-error-msg');
  const uInput  = document.getElementById('login-user');
  const pInput  = document.getElementById('login-pass');

  // Clear previous error state
  uInput.classList.remove('input-error');
  pInput.classList.remove('input-error');
  errBox.classList.add('hidden');

  if (!user && !pass) {
    errMsg.textContent = 'Please enter your username and password.';
    uInput.classList.add('input-error');
    pInput.classList.add('input-error');
    errBox.classList.remove('hidden');
    uInput.focus();
    return;
  }
  if (!user) {
    errMsg.textContent = 'Please enter your username.';
    uInput.classList.add('input-error');
    errBox.classList.remove('hidden');
    uInput.focus();
    return;
  }
  if (!pass) {
    errMsg.textContent = 'Please enter your password.';
    pInput.classList.add('input-error');
    errBox.classList.remove('hidden');
    pInput.focus();
    return;
  }
  if (user !== VALID_USER || pass !== VALID_PASS) {
    errMsg.textContent = 'Incorrect username or password. Please try again.';
    uInput.classList.add('input-error');
    pInput.classList.add('input-error');
    errBox.classList.remove('hidden');
    pInput.value = '';
    pInput.focus();
    return;
  }

  // Success
  document.getElementById('page-login').classList.remove('active');
  document.getElementById('main-navbar').classList.remove('hidden');
  showPage('home');
  updateClock();
  updateGreeting();
  updateDate();
}

// ===== LOGOUT =====
function handleLogout() {
  if (!confirm('Are you sure you want to sign out?')) return;
  // Hide all app pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Hide navbar
  document.getElementById('main-navbar').classList.add('hidden');
  // Reset login form
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('login-user').classList.remove('input-error');
  document.getElementById('login-pass').classList.remove('input-error');
  // Show login
  document.getElementById('page-login').classList.add('active');
}

// ===== TOGGLE PASSWORD VISIBILITY =====
function togglePassword() {
  const input = document.getElementById('login-pass');
  const icon  = document.getElementById('pass-eye');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fa-solid fa-eye';
  }
}

// Allow Enter key on login inputs
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    const loginScreen = document.getElementById('page-login');
    if (loginScreen.classList.contains('active')) handleLogin();
  }
});


function showPage(name) {
  const current = document.querySelector('.page.active');

  if (current && current.id !== 'page-' + name) {
    // Fade-slide out
    current.style.opacity = '0';
    current.style.transform = 'translateY(-12px)';
    current.style.transition = 'opacity 220ms ease, transform 220ms ease';

    setTimeout(() => {
      current.classList.remove('active');
      current.style.opacity = '';
      current.style.transform = '';
      current.style.transition = '';

      const next = document.getElementById('page-' + name);
      if (next) {
        next.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }, 200);
  } else if (!current) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const next = document.getElementById('page-' + name);
    if (next) {
      next.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  if (name === 'emergency') {
    setTimeout(() => {
      document.getElementById('sos-alert').classList.add('hidden');
      clearTimeout(sosTimer);
      renderEmergencyContact();
    }, 220);
  }
  if (name === 'family') {
    setTimeout(() => document.getElementById('call-status').classList.add('hidden'), 220);
  }
  if (name === 'health') {
    setTimeout(() => renderHealthChart(activeChartMetric), 300);
  }
}

// ===== CLOCK & GREETING =====
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const el = document.getElementById('nav-clock');
  if (el) el.textContent = `${h}:${m}`;
}

function updateGreeting() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good Morning!' : h < 17 ? 'Good Afternoon!' : 'Good Evening!';
  const el = document.getElementById('greeting-time');
  if (el) el.textContent = greet;
}

function updateDate() {
  const el = document.getElementById('hero-date');
  if (!el) return;
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  el.textContent = new Date().toLocaleDateString(undefined, opts);
}

// ===== MEDICINE REMINDER =====
let reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
let currentFilter = 'all';

/* ---- helpers ---- */
function saveReminders() {
  localStorage.setItem('reminders', JSON.stringify(reminders));
}

// Returns minutes-since-midnight for a "HH:MM" string
function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Current time in minutes-since-midnight
function nowMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

// "Due Soon" = within next 30 minutes and not taken
function isDue(r) {
  if (r.taken) return false;
  const diff = toMinutes(r.time) - nowMinutes();
  return diff >= 0 && diff <= 30;
}

function statusOf(r) {
  if (r.taken) return 'taken';
  if (isDue(r)) return 'due';
  return 'pending';
}

/* ---- add ---- */
function addReminder() {
  const name  = document.getElementById('med-name').value.trim();
  const time  = document.getElementById('med-time').value;
  const freq  = document.getElementById('med-freq').value;
  const notes = document.getElementById('med-notes').value.trim();

  if (!name) { showToast('Please enter a medicine name!', 'warn'); return; }
  if (!time) { showToast('Please select a reminder time!', 'warn'); return; }

  reminders.push({ id: Date.now(), name, time, freq, notes, taken: false });
  saveReminders();

  document.getElementById('med-name').value  = '';
  document.getElementById('med-time').value  = '';
  document.getElementById('med-notes').value = '';
  document.getElementById('med-freq').value  = 'Once daily';

  renderReminders();
  showToast('✅ Reminder added!', 'success');
}

/* ---- delete ---- */
function deleteReminder(id) {
  if (!confirm('Delete this reminder?')) return;
  reminders = reminders.filter(r => r.id !== id);
  saveReminders();
  renderReminders();
  showToast('Reminder deleted.', 'warn');
}

/* ---- toggle taken ---- */
function toggleTaken(id) {
  const r = reminders.find(r => r.id === id);
  if (!r) return;
  r.taken = !r.taken;
  saveReminders();
  renderReminders();
  showToast(r.taken ? '💊 Marked as taken!' : 'Marked as pending.', 'success');
}

/* ---- edit ---- */
function openEditModal(id) {
  const r = reminders.find(r => r.id === id);
  if (!r) return;
  document.getElementById('edit-id').value    = id;
  document.getElementById('edit-name').value  = r.name;
  document.getElementById('edit-time').value  = r.time;
  document.getElementById('edit-freq').value  = r.freq || 'Once daily';
  document.getElementById('edit-notes').value = r.notes || '';
  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal(e) {
  if (e && e.target !== document.getElementById('edit-modal')) return;
  document.getElementById('edit-modal').classList.add('hidden');
}

function saveEdit() {
  const id    = Number(document.getElementById('edit-id').value);
  const name  = document.getElementById('edit-name').value.trim();
  const time  = document.getElementById('edit-time').value;
  const freq  = document.getElementById('edit-freq').value;
  const notes = document.getElementById('edit-notes').value.trim();

  if (!name) { showToast('Medicine name is required!', 'warn'); return; }
  if (!time) { showToast('Please pick a time!', 'warn'); return; }

  const r = reminders.find(r => r.id === id);
  if (r) { r.name = name; r.time = time; r.freq = freq; r.notes = notes; }
  saveReminders();
  document.getElementById('edit-modal').classList.add('hidden');
  renderReminders();
  showToast('✏️ Reminder updated!', 'success');
}

/* ---- filter ---- */
function filterReminders(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.mf-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderReminders();
}

/* ---- render ---- */
function renderReminders() {
  const list = document.getElementById('reminder-list');

  // Sort by time
  const sorted = [...reminders].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

  // Apply filter
  const filtered = sorted.filter(r => {
    if (currentFilter === 'all')     return true;
    if (currentFilter === 'taken')   return r.taken;
    if (currentFilter === 'pending') return !r.taken;
    if (currentFilter === 'due')     return isDue(r);
    return true;
  });

  // Update stats
  const total     = reminders.length;
  const takenCnt  = reminders.filter(r => r.taken).length;
  const dueCnt    = reminders.filter(r => isDue(r)).length;
  document.getElementById('stat-total').textContent  = total;
  document.getElementById('stat-taken').textContent  = takenCnt;
  document.getElementById('stat-due').textContent    = dueCnt;
  document.getElementById('rem-count').textContent   = filtered.length;

  if (!filtered.length) {
    const msgs = {
      all:     'No reminders yet.<br>Add one above!',
      taken:   'No medicines marked as taken yet.',
      pending: 'All medicines have been taken! 🎉',
      due:     'No medicines due in the next 30 minutes.',
    };
    list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-bell-slash"></i><p>${msgs[currentFilter] || msgs.all}</p></div>`;
    return;
  }

  list.innerHTML = filtered.map(r => {
    const status = statusOf(r);
    const statusBadge = {
      taken:   `<span class="rem-badge badge-taken"><i class="fa-solid fa-circle-check"></i> Taken</span>`,
      due:     `<span class="rem-badge badge-due"><i class="fa-solid fa-bell"></i> Due Soon</span>`,
      pending: `<span class="rem-badge badge-pending"><i class="fa-solid fa-clock"></i> Pending</span>`,
    }[status];

    return `
    <div class="rem-item ${status === 'taken' ? 'rem-taken' : ''}" id="rem-${r.id}">
      <div class="rem-left">
        <button class="rem-check ${r.taken ? 'checked' : ''}" onclick="toggleTaken(${r.id})" title="${r.taken ? 'Mark as pending' : 'Mark as taken'}">
          <i class="fa-solid ${r.taken ? 'fa-circle-check' : 'fa-circle'}"></i>
        </button>
        <div class="rem-info">
          <div class="rem-name">${esc(r.name)}</div>
          <div class="rem-meta">
            <span><i class="fa-solid fa-clock"></i> ${fmtTime(r.time)}</span>
            <span><i class="fa-solid fa-repeat"></i> ${esc(r.freq || 'Once daily')}</span>
          </div>
          ${r.notes ? `<div class="rem-notes"><i class="fa-solid fa-note-sticky"></i> ${esc(r.notes)}</div>` : ''}
          ${statusBadge}
        </div>
      </div>
      <div class="rem-actions">
        <button class="rem-edit-btn" onclick="openEditModal(${r.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="rem-del-btn"  onclick="deleteReminder(${r.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// ===== EMERGENCY CONTACT & SOS =====
let sosTimer = null;

function loadEmergencyContact() {
  return JSON.parse(localStorage.getItem('emergencyContact') || 'null');
}

function saveEmergencyContact() {
  const name  = document.getElementById('ec-name').value.trim();
  const phone = document.getElementById('ec-phone').value.trim();

  if (!name)  { showToast('Please enter a contact name!', 'warn'); return; }
  if (!phone) { showToast('Please enter a phone number!', 'warn'); return; }
  if (!/^[\d\s\+\-\(\)]{6,20}$/.test(phone)) {
    showToast('Please enter a valid phone number!', 'warn'); return;
  }

  localStorage.setItem('emergencyContact', JSON.stringify({ name, phone }));
  renderEmergencyContact();
  showToast('✅ Emergency contact saved!', 'success');
}

function editEmergencyContact() {
  const contact = loadEmergencyContact();
  if (contact) {
    document.getElementById('ec-name').value  = contact.name;
    document.getElementById('ec-phone').value = contact.phone;
  }
  document.getElementById('ec-display').classList.add('hidden');
  document.getElementById('ec-form').classList.remove('hidden');
}

function removeEmergencyContact() {
  if (!confirm('Remove this emergency contact?')) return;
  localStorage.removeItem('emergencyContact');
  renderEmergencyContact();
  showToast('Contact removed.', 'warn');
}

function renderEmergencyContact() {
  const display = document.getElementById('ec-display');
  const form    = document.getElementById('ec-form');
  const contact = loadEmergencyContact();

  if (contact) {
    display.classList.remove('hidden');
    form.classList.add('hidden');
    display.innerHTML = `
      <div class="ec-saved">
        <div class="ec-avatar"><i class="fa-solid fa-user-shield"></i></div>
        <div class="ec-info">
          <div class="ec-cname">${esc(contact.name)}</div>
          <div class="ec-cphone"><i class="fa-solid fa-phone"></i> ${esc(contact.phone)}</div>
        </div>
        <div class="ec-btns">
          <button class="ec-edit-btn" onclick="editEmergencyContact()" title="Edit">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="ec-del-btn" onclick="removeEmergencyContact()" title="Remove">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="ec-ready-badge"><i class="fa-solid fa-circle-check"></i> Ready to call in an emergency</div>
    `;
  } else {
    display.classList.add('hidden');
    form.classList.remove('hidden');
    document.getElementById('ec-name').value  = '';
    document.getElementById('ec-phone').value = '';
  }
}

function triggerSOS() {
  const contact = loadEmergencyContact();
  const alertEl = document.getElementById('sos-alert');

  // Button press animation
  const btn = document.querySelector('.sos-btn');
  btn.style.transform = 'scale(0.88)';
  setTimeout(() => btn.style.transform = '', 220);

  // Populate calling card
  const statusText  = document.getElementById('scc-status-text');
  const nameEl      = document.getElementById('scc-contact-name');
  const numberEl    = document.getElementById('scc-contact-number');
  const connectedEl = document.getElementById('scc-connected');
  const cancelBtn   = document.getElementById('scc-cancel-btn');

  statusText.textContent = 'Calling emergency contact…';
  connectedEl.classList.add('hidden');
  cancelBtn.classList.remove('hidden');

  if (contact) {
    nameEl.textContent   = contact.name;
    numberEl.textContent = contact.phone;
  } else {
    nameEl.textContent   = 'Emergency Services';
    numberEl.textContent = '112';
  }

  alertEl.classList.remove('hidden');
  alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Simulate call connecting after 3 seconds
  clearTimeout(sosTimer);
  sosTimer = setTimeout(() => {
    statusText.textContent = 'Call Connected!';
    connectedEl.classList.remove('hidden');
    cancelBtn.classList.add('hidden');
    showToast('📞 Emergency contact connected!', 'success');
  }, 3000);
}

function cancelSOS() {
  clearTimeout(sosTimer);
  document.getElementById('sos-alert').classList.add('hidden');
  showToast('Call cancelled.', 'warn');
}

// ===== HEALTH TRACKER =====
// ===== HEALTH TRACKER =====
let healthRecords = JSON.parse(localStorage.getItem('healthRecords') || '[]');
let healthChart   = null;
let activeChartMetric = 'sugar';

/* ---- status helpers ---- */
function bpStatus(val) {
  if (!val || val === '—') return null;
  const parts = val.split('/').map(Number);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  const [sys, dia] = parts;
  if (sys < 90 || dia < 60)   return { label: 'Low',    cls: 'hs-low' };
  if (sys <= 120 && dia <= 80) return { label: 'Normal', cls: 'hs-normal' };
  if (sys <= 139 || dia <= 89) return { label: 'Elevated', cls: 'hs-elevated' };
  return { label: 'High', cls: 'hs-high' };
}

function sugarStatus(val) {
  const n = Number(val);
  if (!val || val === '—' || isNaN(n)) return null;
  if (n < 70)   return { label: 'Low',    cls: 'hs-low' };
  if (n <= 140) return { label: 'Normal', cls: 'hs-normal' };
  if (n <= 199) return { label: 'High',   cls: 'hs-elevated' };
  return { label: 'Very High', cls: 'hs-high' };
}

function hrStatus(val) {
  const n = Number(val);
  if (!val || val === '—' || isNaN(n)) return null;
  if (n < 60)  return { label: 'Low',    cls: 'hs-low' };
  if (n <= 100) return { label: 'Normal', cls: 'hs-normal' };
  return { label: 'High', cls: 'hs-high' };
}

function statusTag(st) {
  if (!st) return '';
  return `<span class="hs-tag ${st.cls}">${st.label}</span>`;
}

/* ---- save ---- */
function saveHealth() {
  const bp  = document.getElementById('bp').value.trim();
  const sg  = document.getElementById('sugar').value.trim();
  const hr  = document.getElementById('heartrate').value.trim();

  if (!bp && !sg && !hr) { showToast('Please enter at least one value!', 'warn'); return; }

  // Basic validation
  if (bp && !/^\d{2,3}\/\d{2,3}$/.test(bp)) {
    showToast('BP format should be like 120/80', 'warn'); return;
  }
  if (sg && (Number(sg) < 0 || Number(sg) > 600)) {
    showToast('Enter a valid blood sugar value (0–600)', 'warn'); return;
  }
  if (hr && (Number(hr) < 0 || Number(hr) > 300)) {
    showToast('Enter a valid heart rate (0–300)', 'warn'); return;
  }

  const now = new Date();
  healthRecords.unshift({
    id:    Date.now(),
    bp:    bp || '—',
    sugar: sg || '—',
    hr:    hr || '—',
    date:  now.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }),
    time:  now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ts:    now.getTime()
  });

  if (healthRecords.length > 30) healthRecords.length = 30;
  localStorage.setItem('healthRecords', JSON.stringify(healthRecords));

  document.getElementById('bp').value = '';
  document.getElementById('sugar').value = '';
  document.getElementById('heartrate').value = '';

  renderHealth();
  renderHealthChart(activeChartMetric);
  showToast('✅ Health record saved!', 'success');
}

/* ---- delete ---- */
function deleteHealth(id) {
  if (!confirm('Delete this record?')) return;
  healthRecords = healthRecords.filter(r => r.id !== id);
  localStorage.setItem('healthRecords', JSON.stringify(healthRecords));
  renderHealth();
  renderHealthChart(activeChartMetric);
  showToast('Record deleted.', 'warn');
}

/* ---- chart ---- */
function switchChart(metric, btn) {
  activeChartMetric = metric;
  document.querySelectorAll('.ht-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('hnr-sugar').classList.add('hidden');
  document.getElementById('hnr-hr').classList.add('hidden');
  document.getElementById(metric === 'sugar' ? 'hnr-sugar' : 'hnr-hr').classList.remove('hidden');
  renderHealthChart(metric);
}

function renderHealthChart(metric) {
  const chartCard = document.getElementById('ht-chart-card');
  // Get last 10 records that have the metric
  const data = [...healthRecords]
    .reverse()
    .filter(r => r[metric] && r[metric] !== '—')
    .slice(-10);

  if (data.length < 2) {
    chartCard.classList.add('hidden');
    return;
  }
  chartCard.classList.remove('hidden');

  const labels = data.map(r => r.date.split(' ').slice(0,2).join(' ') + '\n' + r.time);
  const values = data.map(r => Number(r[metric]));

  const colors = {
    sugar: { border: '#d97706', bg: 'rgba(217,119,6,0.12)', point: '#d97706' },
    hr:    { border: '#db2777', bg: 'rgba(219,39,119,0.12)', point: '#db2777' },
  };
  const c = colors[metric];

  const labels2 = {
    sugar: 'Blood Sugar (mg/dL)',
    hr:    'Heart Rate (bpm)',
  };

  const normalRanges = {
    sugar: { min: 70,  max: 140 },
    hr:    { min: 60,  max: 100 },
  };
  const nr = normalRanges[metric];

  const canvas = document.getElementById('health-chart');
  if (healthChart) { healthChart.destroy(); healthChart = null; }

  healthChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: labels2[metric],
          data: values,
          borderColor: c.border,
          backgroundColor: c.bg,
          pointBackgroundColor: values.map(v =>
            v < nr.min ? '#2563eb' : v > nr.max ? '#dc2626' : '#059669'
          ),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 9,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Normal Min',
          data: Array(values.length).fill(nr.min),
          borderColor: 'rgba(5,150,105,0.4)',
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'Normal Max',
          data: Array(values.length).fill(nr.max),
          borderColor: 'rgba(220,38,38,0.4)',
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { family: 'DM Sans', size: 13 },
          bodyFont:  { family: 'DM Sans', size: 14, weight: '700' },
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              const status = metric === 'sugar' ? sugarStatus(v) : hrStatus(v);
              return ` ${v}  ${status ? status.label : ''}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            font: { family: 'DM Sans', size: 11 },
            color: '#64748b',
            maxRotation: 0,
          },
          grid: { color: 'rgba(226,232,240,0.7)' }
        },
        y: {
          ticks: {
            font: { family: 'DM Sans', size: 12, weight: '600' },
            color: '#64748b',
          },
          grid: { color: 'rgba(226,232,240,0.7)' }
        }
      }
    }
  });
}

/* ---- summary bar ---- */
function updateHealthSummary() {
  const latest = healthRecords[0];
  document.getElementById('sum-bp').textContent    = latest ? latest.bp    : '—';
  document.getElementById('sum-sugar').textContent = latest ? latest.sugar : '—';
  document.getElementById('sum-hr').textContent    = latest ? latest.hr    : '—';
}

/* ---- render list ---- */
function renderHealth() {
  const list = document.getElementById('health-list');
  updateHealthSummary();
  document.getElementById('health-count').textContent = healthRecords.length;

  if (!healthRecords.length) {
    list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-clipboard-list"></i><p>No records yet.<br>Save your first reading!</p></div>`;
    document.getElementById('ht-chart-card').classList.add('hidden');
    return;
  }

  list.innerHTML = healthRecords.map(r => {
    const bpSt    = bpStatus(r.bp);
    const sgSt    = sugarStatus(r.sugar);
    const hrSt    = hrStatus(r.hr);
    return `
    <div class="ht-record">
      <div class="ht-rec-header">
        <span class="ht-rec-date"><i class="fa-solid fa-calendar-days"></i> ${r.date}</span>
        <span class="ht-rec-time"><i class="fa-solid fa-clock"></i> ${r.time}</span>
        <button class="rem-del-btn" onclick="deleteHealth(${r.id})" title="Delete" style="margin-left:auto">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
      <div class="ht-rec-vitals">
        <div class="ht-rec-vital">
          <div class="ht-rv-icon hsi-red"><i class="fa-solid fa-droplet"></i></div>
          <div>
            <div class="ht-rv-val">${esc(r.bp)}</div>
            <div class="ht-rv-lbl">BP mmHg</div>
          </div>
          ${statusTag(bpSt)}
        </div>
        <div class="ht-rec-vital">
          <div class="ht-rv-icon hsi-amber"><i class="fa-solid fa-vial"></i></div>
          <div>
            <div class="ht-rv-val">${esc(r.sugar)}</div>
            <div class="ht-rv-lbl">Sugar mg/dL</div>
          </div>
          ${statusTag(sgSt)}
        </div>
        <div class="ht-rec-vital">
          <div class="ht-rv-icon hsi-pink"><i class="fa-solid fa-heart-pulse"></i></div>
          <div>
            <div class="ht-rv-val">${esc(r.hr)}</div>
            <div class="ht-rv-lbl">Heart bpm</div>
          </div>
          ${statusTag(hrSt)}
        </div>
      </div>
    </div>`;
  }).join('');
}


function makeCall(person) {
  const status = document.getElementById('call-status');
  status.classList.remove('hidden');
  status.innerHTML = `<i class="fa-solid fa-phone-volume"></i><div><strong>Calling ${person}…</strong><p>Please wait a moment</p></div>`;

  setTimeout(() => {
    status.innerHTML = `<i class="fa-solid fa-circle-check"></i><div><strong>Connected to ${person}!</strong><p>You're now on a call</p></div>`;
  }, 2200);

  status.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== VOICE ASSISTANT =====
/* ------------------------------------------------------------------
   Uses the Web Speech API (SpeechRecognition) where available.
   Falls back to a simulated recogniser on unsupported browsers.
   ------------------------------------------------------------------ */

let isListening      = false;
let recognition      = null;
let voiceHistory     = [];   // { text, action, time }[]
const VA_MAX_HISTORY = 8;

/* ---- Command map -------------------------------------------------- */
const VOICE_COMMANDS = [
  // Navigation
  { keys: ['home','main menu','dashboard','go back'],
    action: 'navigate', page: 'home',
    icon: 'fa-house',     label: 'Going to Home', color: 'var(--brand)' },

  { keys: ['medicine','reminder','pill','tablet','dose','medication'],
    action: 'navigate', page: 'medicine',
    icon: 'fa-pills',     label: 'Opening Medicine Reminder', color: 'var(--brand-mid)' },

  { keys: ['health','blood pressure','heart rate','sugar','glucose','vitals','tracker'],
    action: 'navigate', page: 'health',
    icon: 'fa-heart-pulse', label: 'Opening Health Tracker', color: 'var(--green)' },

  { keys: ['emergency','sos','help me','call ambulance','danger','urgent'],
    action: 'navigate', page: 'emergency',
    icon: 'fa-triangle-exclamation', label: 'Opening Emergency Help', color: 'var(--red)' },

  { keys: ['call family','call son','call daughter','call doctor','family','phone'],
    action: 'navigate', page: 'family',
    icon: 'fa-phone-volume', label: 'Opening Call Family', color: 'var(--teal)' },

  { keys: ['ai','chat','assistant','carebot','ask','question'],
    action: 'navigate', page: 'ai',
    icon: 'fa-robot',     label: 'Opening AI Assistant', color: 'var(--indigo)' },

  // Informational replies
  { keys: ['hello','hi','hey','good morning','good afternoon','good evening'],
    action: 'reply',
    icon: 'fa-hand-wave', label: 'Hello! How can I help you today?', color: 'var(--brand)' },

  { keys: ['time','what time','clock'],
    action: 'reply_time',
    icon: 'fa-clock',     label: '', color: 'var(--indigo)' },

  { keys: ['thank','thanks','thank you'],
    action: 'reply',
    icon: 'fa-heart',     label: "You're welcome! Stay healthy 😊", color: '#db2777' },

  { keys: ['bye','goodbye','see you','stop'],
    action: 'reply',
    icon: 'fa-hand-wave', label: 'Goodbye! Take care of yourself!', color: 'var(--green)' },
];

/* ---- Match a spoken phrase to a command --------------------------- */
function matchCommand(transcript) {
  const lower = transcript.toLowerCase();
  for (const cmd of VOICE_COMMANDS) {
    if (cmd.keys.some(k => lower.includes(k))) return cmd;
  }
  return null;
}

/* ---- Execute matched command -------------------------------------- */
function executeCommand(transcript, cmd) {
  const resultCard   = document.getElementById('va-result-card');
  const resultText   = document.getElementById('va-result-text');
  const resultAction = document.getElementById('va-result-action');

  resultText.textContent = transcript;
  resultCard.classList.remove('hidden');

  if (!cmd) {
    resultAction.innerHTML = `
      <div class="va-cmd-badge" style="background:var(--amber-lt);color:var(--amber);">
        <i class="fa-solid fa-circle-question"></i>
        Sorry, I didn't understand that. Try one of the commands below.
      </div>`;
    addVoiceHistory(transcript, "Unrecognised command", 'fa-circle-question', 'var(--amber)');
    return;
  }

  let labelText = cmd.label;

  if (cmd.action === 'reply_time') {
    labelText = `The time is ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
  }

  resultAction.innerHTML = `
    <div class="va-cmd-badge" style="background:${cmd.color}18;color:${cmd.color};border:1.5px solid ${cmd.color}30;">
      <i class="fa-solid ${cmd.icon}"></i>
      ${labelText}
    </div>`;

  addVoiceHistory(transcript, labelText, cmd.icon, cmd.color);

  if (cmd.action === 'navigate') {
    showToast(`🎙️ ${labelText}`, 'success');
    setTimeout(() => showPage(cmd.page), 900);
  }
}

/* ---- History log -------------------------------------------------- */
function addVoiceHistory(transcript, action, icon, color) {
  voiceHistory.unshift({
    text: transcript,
    action,
    icon: icon || 'fa-microphone',
    color: color || 'var(--brand)',
    time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
  });
  if (voiceHistory.length > VA_MAX_HISTORY) voiceHistory.length = VA_MAX_HISTORY;
  renderVoiceHistory();
}

function renderVoiceHistory() {
  const wrap    = document.getElementById('va-history');
  const list    = document.getElementById('va-history-list');
  const clearBtn = document.getElementById('va-clear-btn');

  if (!voiceHistory.length) {
    wrap.classList.add('hidden');
    clearBtn.classList.add('hidden');
    return;
  }

  wrap.classList.remove('hidden');
  clearBtn.classList.remove('hidden');

  list.innerHTML = voiceHistory.map(h => `
    <div class="va-history-item">
      <div class="va-hi-icon" style="background:${h.color}18;color:${h.color};">
        <i class="fa-solid ${h.icon}"></i>
      </div>
      <div class="va-hi-info">
        <div class="va-hi-text">"${esc(h.text)}"</div>
        <div class="va-hi-action">${esc(h.action)}</div>
      </div>
      <div class="va-hi-time">${h.time}</div>
    </div>`).join('');
}

function clearVoiceHistory() {
  voiceHistory = [];
  renderVoiceHistory();
  document.getElementById('va-result-card').classList.add('hidden');
}

/* ---- UI helpers --------------------------------------------------- */
function setMicListening(on) {
  const btn    = document.getElementById('mic-btn');
  const icon   = document.getElementById('mic-icon');
  const status = document.getElementById('mic-status');
  const r1     = document.getElementById('ripple1');
  const r2     = document.getElementById('ripple2');
  const live   = document.getElementById('va-live-wrap');
  const hints  = document.getElementById('va-hints');

  isListening = on;

  if (on) {
    btn.classList.add('listening');
    icon.className     = 'fa-solid fa-stop';
    status.textContent = 'Listening… speak now';
    status.style.color = 'var(--red)';
    if (r1) r1.style.animation = 'mic-ripple 1.4s infinite';
    if (r2) r2.style.animation = 'mic-ripple 1.4s .5s infinite';
    live.classList.remove('hidden');
    hints.classList.add('hidden');
    document.getElementById('va-live-text').textContent = '—';
  } else {
    btn.classList.remove('listening');
    icon.className     = 'fa-solid fa-microphone';
    status.textContent = 'Tap to speak';
    status.style.color = '';
    if (r1) r1.style.animation = '';
    if (r2) r2.style.animation = '';
    live.classList.add('hidden');
    hints.classList.remove('hidden');
  }
}

/* ---- Simulate voice (hint chip clicks) ---------------------------- */
function simulateVoice(phrase) {
  if (isListening) stopVoice();
  setMicListening(true);
  document.getElementById('va-live-text').textContent = phrase;

  setTimeout(() => {
    setMicListening(false);
    const cmd = matchCommand(phrase);
    executeCommand(phrase, cmd);
  }, 1000);
}

/* ---- Web Speech API ----------------------------------------------- */
function buildRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const r         = new SR();
  r.lang          = 'en-US';
  r.continuous    = false;
  r.interimResults = true;
  r.maxAlternatives = 1;

  r.onstart = () => setMicListening(true);

  r.onresult = (e) => {
    let interim = '', final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t;
      else interim += t;
    }
    const live = document.getElementById('va-live-text');
    if (live) live.textContent = final || interim || '—';
    if (final) {
      setMicListening(false);
      const cmd = matchCommand(final.trim());
      executeCommand(final.trim(), cmd);
    }
  };

  r.onerror = (e) => {
    setMicListening(false);
    const msgs = {
      'not-allowed':   'Microphone permission denied. Please allow access.',
      'no-speech':     'No speech detected. Please try again.',
      'network':       'Network error. Check your connection.',
      'aborted':       null,   // user stopped — silent
    };
    const msg = msgs[e.error];
    if (msg) showToast(msg, 'warn');
  };

  r.onend = () => { if (isListening) setMicListening(false); };

  return r;
}

function stopVoice() {
  if (recognition) { try { recognition.stop(); } catch(_){} }
  setMicListening(false);
}

/* ---- Main toggle -------------------------------------------------- */
function toggleMic() {
  if (isListening) { stopVoice(); return; }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SR) {
    // Real speech recognition
    recognition = buildRecognition();
    try {
      recognition.start();
    } catch (err) {
      showToast('Could not start microphone. Try again.', 'warn');
    }
  } else {
    // Simulation fallback for browsers without Speech API
    setMicListening(true);
    const demos = [
      'medicine reminder', 'check health', 'emergency help',
      'call my son', 'open ai assistant', 'hello'
    ];
    const pick = demos[Math.floor(Math.random() * demos.length)];
    let t = 0;
    const chars = pick.split('');
    let built = '';
    const liveEl = document.getElementById('va-live-text');

    const typer = setInterval(() => {
      built += chars[t++] || '';
      if (liveEl) liveEl.textContent = built;
      if (t >= chars.length) {
        clearInterval(typer);
        setTimeout(() => {
          setMicListening(false);
          const cmd = matchCommand(built);
          executeCommand(built, cmd);
        }, 600);
      }
    }, 60);
  }
}



// ===== TOAST =====
function showToast(msg, type) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  const isSuccess = type === 'success';
  t.innerHTML = `<i class="fa-solid fa-${isSuccess ? 'circle-check' : 'circle-exclamation'}"></i>&nbsp; ${msg}`;
  Object.assign(t.style, {
    position: 'fixed', bottom: '30px', left: '50%',
    transform: 'translateX(-50%)',
    background: isSuccess ? '#059669' : '#d97706',
    color: '#fff', padding: '14px 26px',
    borderRadius: '50px', fontSize: '16px',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: '700', boxShadow: '0 8px 28px rgba(15,23,42,.22)',
    zIndex: '9999', whiteSpace: 'nowrap',
    display: 'flex', alignItems: 'center', gap: '8px'
  });
  document.body.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 2600);
}

// ===== HELPERS =====
function esc(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

// ── AI CHAT ───────────────────────────────────────────────────────────────────
// Full conversation history sent to server on every message so the
// AI has context. Cleared only when user hits "Clear".
let chatHistory = [];   // [{ role: 'user'|'assistant', content: string }]

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appendMessage(text, sender) {
  const win   = document.getElementById('chat-window');
  const isBot = sender === 'bot';
  const row   = document.createElement('div');
  row.className = `chat-row ${isBot ? 'bot-row' : 'user-row'}`;

  const chips = document.getElementById('suggestion-chips');
  if (!isBot && chips) chips.style.display = 'none';

  const formatted = isBot ? esc(text).replace(/\n/g, '<br>') : esc(text);

  row.innerHTML = `
    <div class="chat-avatar ${isBot ? 'bot-avatar' : 'user-avatar'}">
      <i class="fa-solid ${isBot ? 'fa-robot' : 'fa-user'}"></i>
    </div>
    <div class="chat-bubble ${isBot ? 'bot-bubble' : 'user-bubble'}">
      ${formatted}
      <div class="bubble-time">${nowTime()}</div>
    </div>`;

  win.appendChild(row);
  win.scrollTop = win.scrollHeight;
}

function appendError(msg) {
  const win = document.getElementById('chat-window');
  const row = document.createElement('div');
  row.className = 'chat-row bot-row';
  row.innerHTML = `
    <div class="chat-avatar bot-avatar"><i class="fa-solid fa-robot"></i></div>
    <div class="chat-bubble bot-bubble ai-error-bubble">
      <i class="fa-solid fa-circle-exclamation"></i> ${esc(msg)}
      <div class="bubble-time">${nowTime()}</div>
    </div>`;
  win.appendChild(row);
  win.scrollTop = win.scrollHeight;
}

function showTyping() {
  document.getElementById('typing-indicator').classList.remove('hidden');
  document.getElementById('chat-window').scrollTop = 999999;
}

function hideTyping() {
  document.getElementById('typing-indicator').classList.add('hidden');
}

async function sendMessage() {
  const input  = document.getElementById('chat-input');
  const btn    = document.getElementById('send-btn');
  const text   = input.value.trim();
  if (!text) return;

  input.value  = '';
  input.focus();
  btn.disabled = true;

  appendMessage(text, 'user');
  chatHistory.push({ role: 'user', content: text });
  showTyping();

  try {
    const { ok, data } = await api('POST', '/api/chat', { messages: chatHistory });
    hideTyping();

    if (!ok) {
      appendError(data.error || 'Something went wrong. Please try again.');
      chatHistory.pop();
    } else {
      appendMessage(data.reply, 'bot');
      chatHistory.push({ role: 'assistant', content: data.reply });
      if (chatHistory.length > 40) chatHistory = chatHistory.slice(-40);
    }
  } catch (err) {
    hideTyping();
    appendError('Network error. Check your connection and try again.');
    chatHistory.pop();
  }

  btn.disabled = false;
}

function sendSuggestion(text) {
  document.getElementById('chat-input').value = text;
  sendMessage();
}

function clearChat() {
  if (!confirm('Clear all chat messages?')) return;
  chatHistory = [];
  const win   = document.getElementById('chat-window');
  win.innerHTML = `
    <div class="chat-row bot-row">
      <div class="chat-avatar bot-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="chat-bubble bot-bubble">
        <p>👋 Hello! I'm <strong>CareBot</strong>, your personal AI health assistant.</p>
        <p style="margin-top:8px;">Ask me anything about health, medicine, diet, or just say hello! 😊</p>
        <div class="bubble-time">${nowTime()}</div>
      </div>
    </div>
    <div class="suggestion-chips" id="suggestion-chips">
      <div class="chips-label">Try asking:</div>
      <div class="chips-row">
        <button class="chip" onclick="sendSuggestion('Hello!')"><i class="fa-solid fa-hand-wave"></i> Hello</button>
        <button class="chip" onclick="sendSuggestion('What foods are good for high blood pressure?')"><i class="fa-solid fa-heart"></i> BP diet</button>
        <button class="chip" onclick="sendSuggestion('How important is it to take medicine on time?')"><i class="fa-solid fa-pills"></i> Medicine tips</button>
        <button class="chip" onclick="sendSuggestion('How much water should I drink each day?')"><i class="fa-solid fa-droplet"></i> Hydration</button>
        <button class="chip" onclick="sendSuggestion('I feel dizzy, what should I do?')"><i class="fa-solid fa-face-dizzy"></i> Feeling dizzy</button>
        <button class="chip" onclick="sendSuggestion('Give me tips for better sleep.')"><i class="fa-solid fa-moon"></i> Sleep tips</button>
      </div>
    </div>`;
}

// Set welcome bubble time on load
// ── FAQ TOGGLE ────────────────────────────────────────────────────────────────
function toggleFaq(el) {
  const item = el.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  // Close all
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

// ── LOADING SCREEN ────────────────────────────────────────────────────────────
function spawnParticles() {
  const container = document.getElementById('ls-particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'ls-particle';
    const size = 2 + Math.random() * 3;
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px; height: ${size}px;
      animation-duration: ${4 + Math.random() * 7}s;
      animation-delay: ${Math.random() * -5}s;
      opacity: ${.1 + Math.random() * .3};
    `;
    container.appendChild(p);
  }
}

function runLoadingScreen(onDone) {
  spawnParticles();
  const screen   = document.getElementById('loading-screen');
  const statusEl = document.getElementById('ls-status');
  const steps = [
    [200,  '✦ Loading assets…'],
    [650,  '✦ Connecting to server…'],
    [1100, '✦ Restoring session…'],
    [1550, '✦ Almost ready…'],
    [1850, '✦ Welcome back!'],
  ];

  steps.forEach(([delay, msg]) => {
    setTimeout(() => { if (statusEl) statusEl.textContent = msg; }, delay);
  });

  setTimeout(() => {
    if (screen) {
      screen.classList.add('ls-fade-out');
      setTimeout(() => {
        screen.style.display = 'none';
        onDone();
      }, 480);
    } else {
      onDone();
    }
  }, 2200);
}

// ── NAVBAR SCROLL SHADOW ──────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.getElementById('main-navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 8);
}, { passive: true });



// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Set welcome bubble time
  const wt = document.getElementById('welcome-time');
  if (wt) wt.textContent = nowTime();

  setInterval(updateClock, 10000);
  setInterval(updateGreeting, 60000);

  runLoadingScreen(async () => {
    // Check if already logged in (page refresh)
    try {
      const { ok, data } = await api('GET', '/api/me');
      if (ok && data.authenticated) {
        document.getElementById('page-login').classList.remove('active');
        document.getElementById('main-navbar').classList.remove('hidden');
        showPage('home');
        updateClock(); updateGreeting(); updateDate();
        await loadReminders();
        await loadHealth();
        return;
      }
    } catch (_) {}

    // Show login
    document.getElementById('page-login').classList.add('active');
    const uField = document.getElementById('login-user');
    if (uField) setTimeout(() => uField.focus(), 200);
  });
});

