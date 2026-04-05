/* ══════════════════════════════════════════════════════════════
   CardioSense — script.js
   Heart Failure Prediction System
   All UI text strictly in English.
══════════════════════════════════════════════════════════════ */

'use strict';

// ── Config ──────────────────────────────────────────────────
const API_URL       = 'https://heart-failure-project.onrender.com';
const MIN_LOAD_MS   = 1100; // minimum loading animation duration

// ── Model metadata ───────────────────────────────────────────
const MODELS = [
  { key: 'decision_tree', label: 'Decision Tree',       tag: 'Tree-Based'     },
  { key: 'knn',           label: 'KNN',                 tag: 'Instance-Based' },
  { key: 'naive_bayes',   label: 'Naïve Bayes',         tag: 'Probabilistic'  },
  { key: 'random_forest', label: 'Random Forest',       tag: 'Ensemble'       },
];

// ── DOM handles ──────────────────────────────────────────────
const form             = document.getElementById('predictionForm');
const predictBtn       = document.getElementById('predictBtn');
const btnContent       = document.getElementById('btnContent');
const btnLoader        = document.getElementById('btnLoader');
const formError        = document.getElementById('formError');
const errorText        = document.getElementById('errorText');
const fieldCounterEl   = document.getElementById('fieldCounter');
const idlePlaceholder  = document.getElementById('idlePlaceholder');
const resultsPanel     = document.getElementById('resultsPanel');
const consensusBanner  = document.getElementById('consensusBanner');
const consensusIconWrap= document.getElementById('consensusIconWrap');
const consensusIcon    = document.getElementById('consensusIcon');
const consensusVerdict = document.getElementById('consensusVerdict');
const consensusScore   = document.getElementById('consensusScore');

// ── Field completion counter ──────────────────────────────────
const allFields = Array.from(form.querySelectorAll('input, select'));

function updateFieldCounter() {
  const filled = allFields.filter(el => el.value.trim() !== '' && el.value !== '').length;
  fieldCounterEl.textContent = `${filled} / 12 filled`;
  fieldCounterEl.classList.toggle('full', filled === 12);
}

allFields.forEach(el => {
  el.addEventListener('input',  updateFieldCounter);
  el.addEventListener('change', updateFieldCounter);
});

// ── Build payload — exact keys for FastAPI Pydantic model ────
function buildPayload() {
  return {
    age:                      parseFloat(document.getElementById('age').value),
    anaemia:                  parseInt(document.getElementById('anaemia').value, 10),
    creatinine_phosphokinase: parseFloat(document.getElementById('creatinine_phosphokinase').value),
    diabetes:                 parseInt(document.getElementById('diabetes').value, 10),
    ejection_fraction:        parseFloat(document.getElementById('ejection_fraction').value),
    high_blood_pressure:      parseInt(document.getElementById('high_blood_pressure').value, 10),
    platelets:                parseFloat(document.getElementById('platelets').value),
    serum_creatinine:         parseFloat(document.getElementById('serum_creatinine').value),
    serum_sodium:             parseFloat(document.getElementById('serum_sodium').value),
    sex:                      parseInt(document.getElementById('sex').value, 10),
    smoking:                  parseInt(document.getElementById('smoking').value, 10),
    time:                     parseFloat(document.getElementById('time').value),
  };
}

// ── Loading state ────────────────────────────────────────────
function setLoading(on) {
  predictBtn.disabled = on;
  btnContent.classList.toggle('hidden', on);
  btnLoader.classList.toggle('hidden', !on);
}

// ── Error display ─────────────────────────────────────────────
function showError(msg) {
  errorText.textContent = msg;
  formError.classList.remove('hidden');
}

function hideError() {
  formError.classList.add('hidden');
}

// ── Highlight invalid fields ──────────────────────────────────
function markInvalidFields() {
  allFields.forEach(el => {
    if (!el.checkValidity()) {
      el.classList.add('is-invalid');
      const clear = () => {
        el.classList.remove('is-invalid');
        el.removeEventListener('input',  clear);
        el.removeEventListener('change', clear);
      };
      el.addEventListener('input',  clear);
      el.addEventListener('change', clear);
    }
  });
}

// ── Render a single model card ────────────────────────────────
function renderCard(key, value) {
  const card     = document.getElementById(`card-${key}`);
  const tagEl    = document.getElementById(`tag-${key}`);
  const verdictEl= document.getElementById(`verdict-${key}`);
  const barEl    = document.getElementById(`accentbar-${key}`);

  // Clear previous states
  card.classList.remove('is-safe', 'is-risk');

  // Restart animation for stagger effect
  card.style.animation = 'none';
  void card.offsetWidth; // force reflow
  card.style.animation = '';

  if (value === 0) {
    card.classList.add('is-safe');
    tagEl.textContent     = 'Healthy';
    verdictEl.textContent = 'Low Risk — Healthy';
  } else {
    card.classList.add('is-risk');
    tagEl.textContent     = 'At Risk';
    verdictEl.textContent = 'High Risk — Cardiac Alert';
  }
}

// ── Render the consensus banner ───────────────────────────────
function renderConsensus(data) {
  const riskCount = MODELS.filter(m => data[m.key] === 1).length;
  const safeCount = MODELS.length - riskCount;

  // Icon + color class
  consensusIconWrap.className = 'consensus-icon';

  if (riskCount === 0) {
    consensusIconWrap.classList.add('consensus-icon--safe');
    consensusIcon.className  = 'fa-solid fa-heart-circle-check';
    consensusVerdict.textContent = 'No Risk Detected — Patient Appears Healthy';
    consensusVerdict.style.color = 'var(--safe)';
  } else if (riskCount === MODELS.length) {
    consensusIconWrap.classList.add('consensus-icon--risk');
    consensusIcon.className  = 'fa-solid fa-heart-circle-exclamation';
    consensusVerdict.textContent = 'High Risk — All Models Flag Heart Failure';
    consensusVerdict.style.color = 'var(--risk)';
  } else {
    consensusIconWrap.classList.add('consensus-icon--mixed');
    consensusIcon.className  = 'fa-solid fa-heart-circle-xmark';
    consensusVerdict.textContent = `Mixed Signal — ${riskCount} of 4 Models Flag Risk`;
    consensusVerdict.style.color = '#fbbf24';
  }

  consensusScore.textContent = `${safeCount} safe / ${riskCount} risk`;
}

// ── Main render: paint the full dashboard ────────────────────
function renderResults(data) {
  // Validate required keys exist
  const missing = MODELS.map(m => m.key).filter(k => !(k in data));
  if (missing.length) {
    throw new Error(`Unexpected API response. Missing keys: ${missing.join(', ')}`);
  }

  // Switch idle → results
  idlePlaceholder.classList.add('hidden');
  resultsPanel.classList.remove('hidden');

  // Consensus
  renderConsensus(data);

  // Individual cards (stagger is via CSS --delay custom property)
  MODELS.forEach(({ key }) => renderCard(key, data[key]));
}

// ── Reset dashboard back to idle ──────────────────────────────
function resetDashboard() {
  resultsPanel.classList.add('hidden');
  idlePlaceholder.classList.remove('hidden');

  MODELS.forEach(({ key }) => {
    const card     = document.getElementById(`card-${key}`);
    const tagEl    = document.getElementById(`tag-${key}`);
    const verdictEl= document.getElementById(`verdict-${key}`);
    card.classList.remove('is-safe', 'is-risk');
    tagEl.textContent     = '';
    verdictEl.textContent = '—';
  });
}

// ── Form submit handler ───────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  // HTML5 native validation
  if (!form.checkValidity()) {
    markInvalidFields();
    showError('Please complete all 12 fields before running the prediction.');
    return;
  }

  const payload = buildPayload();

  setLoading(true);
  const startTime = Date.now();

  try {
    const response = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    // Enforce minimum loading duration for UX polish
    const elapsed   = Date.now() - startTime;
    const remaining = MIN_LOAD_MS - elapsed;
    if (remaining > 0) await sleep(remaining);

    if (!response.ok) {
      let detail = `Server error: HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (body.detail) detail = String(body.detail);
      } catch (_) { /* ignore parse failures */ }
      throw new Error(detail);
    }

    const data = await response.json();
    renderResults(data);

  } catch (err) {
    // Ensure loading runs its minimum duration even on failure
    const elapsed   = Date.now() - startTime;
    const remaining = MIN_LOAD_MS - elapsed;
    if (remaining > 0) await sleep(remaining);

    console.error('[CardioSense] Prediction error:', err);

    const isFetchFail = err.message?.toLowerCase().includes('failed to fetch') ||
                        err.message?.toLowerCase().includes('networkerror');

    showError(
      isFetchFail
        ? 'Cannot connect to the prediction API. Please ensure the FastAPI server is running at localhost:8000.'
        : err.message || 'An unexpected error occurred. Please try again.'
    );

    resetDashboard();

  } finally {
    setLoading(false);
  }
});

// ── Clear error when user edits any field ─────────────────────
form.addEventListener('input',  hideError);
form.addEventListener('change', hideError);

// ── Utility ──────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
