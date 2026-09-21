// ── AI Conversion Prompt ───────────────────────────────────────────────────
const AI_CONVERSION_PROMPT = `You are an expert question paper extractor.
Extract all questions from the provided PDF or images and output ONLY a valid JSON in the following format:

{
  "subject": "<Subject Name>",
  "exam_label": "<Exam / Class / Year>",
  "questions": [
    {
      "id": 1,
      "question": "<Full question text in Assamese and/or English. Use $...$ for inline math and $$...$$ for display equations>",
      "is_mcq": true,
      "options": [
        "<Option A text/value without (A) prefix>",
        "<Option B text/value without (B) prefix>",
        "<Option C text/value without (C) prefix>",
        "<Option D text/value without (D) prefix>"
      ]
    }
  ]
}

CRITICAL RULES:
1. Output your ENTIRE response inside a SINGLE markdown code block starting with \`\`\`json and ending with \`\`\`.
2. Do NOT write any conversational text, notes, or introductions before or after the code block.
3. Escape all LaTeX backslashes inside JSON strings with double backslash (e.g. \\\\frac{1}{2}, \\\\times, \\\\sin, \\\\int).
4. If bilingual, put Assamese first, two newlines (\\n\\n), then English.
5. In "options", provide ONLY clean values (never include "(A)", "A.", or "(B)").
6. Never include citations like [cite: 1] or footnotes anywhere in the output.`;

// ── State ───────────────────────────────────────────────────────────────────
let questions = [];
let activeStep = 1;

// ── DOM References ──────────────────────────────────────────────────────────
const stepCards       = [1, 2, 3].map(i => document.getElementById(`step-card-${i}`));
const stepHeaders     = [1, 2, 3].map(i => document.getElementById(`step-header-${i}`));

// Step 1
const promptBoxText   = document.getElementById('prompt-box-text');
const btnCopyPrompt   = document.getElementById('btn-copy-prompt');

// Step 2
const textareaJson    = document.getElementById('textarea-json-input');
const selectPreset    = document.getElementById('select-preset');
const btnLoadPreset   = document.getElementById('btn-load-preset');
const btnOpenFile     = document.getElementById('btn-open-file');
const inputFile       = document.getElementById('input-file');
const btnParseJson    = document.getElementById('btn-parse-json');

// Step 3
const statusSummary   = document.getElementById('status-summary-text');
const inputSubject    = document.getElementById('input-subject');
const inputExamLabel  = document.getElementById('input-exam-label');
const btnSaveJson     = document.getElementById('btn-save-json');
const slideCanvas     = document.getElementById('slide-canvas');
const slideQContent   = document.getElementById('slide-q-content');
const slideOptsCont   = document.getElementById('slide-opts-container');
const slideFooterNum  = document.getElementById('slide-footer-num');
const btnGeneratePpt  = document.getElementById('btn-generate-ppt');
const btnGenerateText = document.getElementById('btn-generate-text');

// Header & Settings
const btnSyncPill     = document.getElementById('btn-sync-pill');
const syncDot         = document.getElementById('sync-dot');
const syncText        = document.getElementById('sync-text');
const btnSettings     = document.getElementById('btn-settings');
const btnThemeToggle  = document.getElementById('btn-theme-toggle');
const themeMoonIcon   = document.getElementById('theme-moon-icon');

// Modal Settings
const modalSettings   = document.getElementById('modal-settings');
const btnCloseSettings= document.getElementById('btn-close-settings');
const inputGithubRepo = document.getElementById('input-github-repo');
const inputGithubToken= document.getElementById('input-github-token');
const checkboxAutoSync= document.getElementById('checkbox-auto-sync');
const btnCheckSyncNow = document.getElementById('btn-check-sync-now');
const btnSaveSettings = document.getElementById('btn-save-settings');
const btnInstallFont  = document.getElementById('btn-install-font');

// ── Accordion Controller ────────────────────────────────────────────────────
function openStep(stepNum) {
  activeStep = stepNum;
  stepCards.forEach((card, idx) => {
    if (idx + 1 === stepNum) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

stepHeaders.forEach((header, idx) => {
  header?.addEventListener('click', () => {
    const targetStep = idx + 1;
    if (activeStep === targetStep) {
      // Toggle collapsed/open
      stepCards[idx].classList.toggle('active');
    } else {
      openStep(targetStep);
    }
  });
});

// ── Step 1: Initialize Prompt & Copy ────────────────────────────────────────
if (promptBoxText) {
  promptBoxText.textContent = AI_CONVERSION_PROMPT;
}

btnCopyPrompt?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(AI_CONVERSION_PROMPT);
    const origHtml = btnCopyPrompt.innerHTML;
    btnCopyPrompt.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span>Copied!</span>
    `;
    setTimeout(() => {
      btnCopyPrompt.innerHTML = origHtml;
      // Mark step 1 completed and auto-expand step 2
      stepCards[0].classList.add('completed');
      openStep(2);
      if (textareaJson) textareaJson.focus();
    }, 500);
  } catch (err) {
    alert('Clipboard error: ' + err.message);
  }
});

// ── Step 2: Presets & JSON Parsing ──────────────────────────────────────────
const EXAMPLE_SETS = {
  physics: {
    subject: 'Physics',
    exam_label: 'Class XII · Mechanics',
    questions: [
      {
        question: `একটি বস্তুৰ ভৰ $m = 2$ kg আৰু বেগ $v = 10$ m/s। বস্তুটোৰ গতিশক্তি নির্ণয় কৰা।\n\nA body of mass $m = 2$ kg moves with velocity $v = 10$ m/s. Find its kinetic energy using:\n\n$$KE = \\frac{1}{2}mv^2$$`,
        is_mcq: true,
        options: ['100 J', '50 J', '200 J', '25 J']
      },
      {
        question: `এটা $q = 1.6 \\times 10^{-19}$ C আধান $v = 2 \\times 10^6$ m/s বেগেৰে $B = 0.5$ T চুম্বক ক্ষেত্ৰৰ লম্বভাৱে গতি কৰিছে। আধানটোৰ ওপৰত ক্ৰিয়া কৰা চুম্বকীয় বল কিমান?\n\nA charge $q = 1.6 \\times 10^{-19}$ C moves with velocity $v = 2 \\times 10^6$ m/s perpendicular to a magnetic field $B = 0.5$ T. Find the magnetic force acting on it:  $F = qvB\\sin\\theta$`,
        is_mcq: true,
        options: ['$1.6 \\times 10^{-13}$ N', '$3.2 \\times 10^{-13}$ N', '$0.8 \\times 10^{-13}$ N', '0 N']
      }
    ]
  },
  chemistry: {
    subject: 'Chemistry',
    exam_label: 'Class XII · Physical Chemistry',
    questions: [
      {
        question: `$T = 300$ K উষ্ণতাত আৰু $V = 10$ L আয়তনত $n = 2$ ম'ল আদৰ্শ গেছৰ চাপ নিৰ্ণয় কৰা। ($R = 0.0821$ L·atm/(mol·K))\n\nFind the pressure of $n = 2$ moles of an ideal gas at temperature $T = 300$ K occupying a volume of $V = 10$ L using:\n\n$$PV = nRT$$`,
        is_mcq: true,
        options: ['4.92 atm', '2.46 atm', '9.84 atm', '1.23 atm']
      }
    ]
  },
  maths: {
    subject: 'Mathematics',
    exam_label: 'Class XII · Calculus',
    questions: [
      {
        question: `তলৰ নিৰ্দিষ্ট সমাকলনটোৰ মান নিৰ্ণয় কৰা:\n\nEvaluate the following definite integral:\n\n$$\\int_{0}^{2} (3x^2 + 2x + 1) \\, dx$$`,
        is_mcq: true,
        options: ['14', '12', '16', '10']
      }
    ]
  }
};

btnLoadPreset?.addEventListener('click', () => {
  const presetKey = selectPreset.value;
  let presetData;
  if (presetKey === 'all') {
    presetData = {
      subject: 'Science & Mathematics',
      exam_label: 'Model Exam · 2025',
      questions: [
        ...EXAMPLE_SETS.physics.questions,
        ...EXAMPLE_SETS.chemistry.questions,
        ...EXAMPLE_SETS.maths.questions
      ]
    };
  } else {
    presetData = EXAMPLE_SETS[presetKey] || EXAMPLE_SETS.physics;
  }
  textareaJson.value = JSON.stringify(presetData, null, 2);
  parseAndLoad(textareaJson.value);
});

btnOpenFile?.addEventListener('click', () => {
  if (inputFile) {
    inputFile.value = '';
    inputFile.click();
  }
});

inputFile?.addEventListener('change', (e) => {
  const file = e.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      textareaJson.value = evt.target.result;
      parseAndLoad(evt.target.result);
    } catch (err) {
      alert('Error reading file: ' + err.message);
    }
  };
  reader.readAsText(file, 'UTF-8');
});

btnParseJson?.addEventListener('click', () => {
  const text = textareaJson.value.trim();
  if (!text) {
    alert('Please paste JSON text first or click "Load Example".');
    return;
  }
  parseAndLoad(text);
});

function stripCitations(text) {
  if (!text) return '';
  return String(text)
    .replace(/\[(?:cite|citation|source|ref):\s*[^\]\n]*\]?/gi, '')
    .replace(/\[cite:\s*\d+/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ \n/g, '\n')
    .replace(/\n /g, '\n')
    .trim();
}

function parseAndLoad(rawText) {
  if (!rawText || !rawText.trim()) return;
  const clean = rawText.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (e1) {
    try {
      const repaired = clean.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
      parsed = JSON.parse(repaired);
    } catch (e2) {
      alert('Invalid JSON format. Please verify JSON syntax.');
      return;
    }
  }

  let rawQuestions = [];
  let subject = '';
  let examLabel = '';

  if (Array.isArray(parsed)) {
    rawQuestions = parsed;
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.questions)) rawQuestions = parsed.questions;
    if (parsed.subject) subject = String(parsed.subject);
    if (parsed.exam_label) examLabel = String(parsed.exam_label);
  }

  if (!rawQuestions || rawQuestions.length === 0) {
    alert('No questions array found in JSON.');
    return;
  }

  if (subject && inputSubject) inputSubject.value = subject;
  if (examLabel && inputExamLabel) inputExamLabel.value = examLabel;

  questions = rawQuestions.map((q, idx) => {
    let opts = Array.isArray(q.options) ? q.options.map(o => stripCitations(o)) : [];
    opts = opts.map(o => o.replace(/^\(?[A-Da-d]\)?[\.\:\)]\s*/, ''));
    const isMcq = Boolean(q.is_mcq || opts.some(o => o.trim()));
    while (opts.length < 4) opts.push('');
    return {
      id: idx + 1,
      question: stripCitations(q.question || ''),
      is_mcq: isMcq,
      options: opts.slice(0, 4)
    };
  });

  // Mark step 2 completed
  stepCards[1].classList.add('completed');

  // Update Step 3 Summary & Preview
  const mcqCount = questions.filter(q => q.is_mcq).length;
  statusSummary.textContent = `${questions.length} Questions Ready (${mcqCount} MCQ, ${questions.length - mcqCount} Subjective)`;
  renderSlidePreview();

  // Advance to Step 3
  openStep(3);
}

// ── Step 3: Slide Preview & Generation ──────────────────────────────────────
function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseSegments(text) {
  const segs = [];
  let last = 0;
  const pat = /\$\$(.+?)\$\$|\$(.+?)\$/gs;
  let m;
  while ((m = pat.exec(text)) !== null) {
    if (m.index > last) segs.push(['text', text.slice(last, m.index)]);
    if (m[1] != null)   segs.push(['display', m[1]]);
    else                segs.push(['inline',  m[2]]);
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push(['text', text.slice(last)]);
  return segs;
}

function renderSlidePreview() {
  if (!slideCanvas) return;
  const q = questions[0];
  if (!q) {
    slideQContent.innerHTML = '<span style="color: #64748b; font-style: italic;">No questions loaded yet.</span>';
    slideOptsCont.innerHTML = '';
    return;
  }

  const paragraphs = q.question.split(/\n\s*\n/);
  let contentHtml = '';

  paragraphs.forEach((p) => {
    const lines = p.split('\n');
    lines.forEach((line) => {
      const segs = parseSegments(line);
      let lineHtml = '';
      segs.forEach(([type, content]) => {
        if (type === 'text') {
          lineHtml += escHtml(content);
        } else if (type === 'inline') {
          lineHtml += `<span class="slide-math-inline">\\(${escHtml(content)}\\)</span>`;
        } else if (type === 'display') {
          lineHtml += `<div class="slide-math-display">\\[${escHtml(content)}\\]</div>`;
        }
      });
      contentHtml += `<div>${lineHtml || '&nbsp;'}</div>`;
    });
    contentHtml += '<div style="height: 6px;"></div>';
  });

  slideQContent.innerHTML = contentHtml;

  if (q.is_mcq && q.options.some(o => o && o.trim())) {
    let optsHtml = '';
    ['A', 'B', 'C', 'D'].forEach((lbl, i) => {
      const optVal = q.options[i] ? q.options[i].trim() : '';
      if (!optVal) return;
      const segs = parseSegments(optVal);
      let optTextHtml = '';
      segs.forEach(([t, c]) => {
        if (t === 'text') {
          optTextHtml += escHtml(c);
        } else if (t === 'inline' || t === 'display') {
          optTextHtml += `\\(${escHtml(c)}\\)`;
        }
      });
      optsHtml += `
        <div class="slide-option-item">
          <b>(${lbl})</b>
          <span>${optTextHtml}</span>
        </div>
      `;
    });
    slideOptsCont.innerHTML = optsHtml;
  } else {
    slideOptsCont.innerHTML = '';
  }

  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise([slideCanvas]).catch(() => {});
  }
}

btnSaveJson?.addEventListener('click', () => {
  if (!questions.length) {
    alert('No questions loaded to save.');
    return;
  }
  const exportData = {
    subject: inputSubject?.value.trim() || 'Physics',
    exam_label: inputExamLabel?.value.trim() || '',
    questions: questions.map(q => ({
      question: q.question,
      is_mcq: q.is_mcq,
      options: q.is_mcq ? q.options : []
    }))
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const subClean = (inputSubject?.value.trim() || 'questions').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  a.download = `${subClean}_questions.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

btnGeneratePpt?.addEventListener('click', async () => {
  if (!questions.length) {
    alert('Please load questions in Step 2 first.');
    openStep(2);
    return;
  }

  let saveDir;
  try {
    saveDir = await window.electronAPI.selectDirectory({ title: 'Select Output Folder for PowerPoint' });
  } catch (e) {
    console.error(e);
  }
  if (!saveDir) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const subClean = (inputSubject?.value.trim() || 'Presentation').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fullPath = `${saveDir}\\${subClean}_${timestamp}.pptx`;

  btnGeneratePpt.disabled = true;
  btnGenerateText.textContent = 'Generating Presentation...';

  const payload = {
    subject: inputSubject?.value.trim() || 'Physics',
    exam_label: inputExamLabel?.value.trim() || '',
    questions: questions.map(q => ({
      question: q.question,
      is_mcq: q.is_mcq,
      options: q.is_mcq ? q.options : []
    })),
    _output: fullPath
  };

  try {
    const result = await window.electronAPI.mathPptGenerate(payload);
    if (result && result.success) {
      btnGenerateText.textContent = 'Downloaded & Saved!';
      await window.electronAPI.showInFolder(result.output);
      setTimeout(() => {
        btnGenerateText.textContent = 'Download PPT';
        btnGeneratePpt.disabled = false;
      }, 3500);
    } else {
      alert('PowerPoint Generation Error:\n' + (result?.error || 'Unknown failure.'));
      btnGenerateText.textContent = 'Download PPT';
      btnGeneratePpt.disabled = false;
    }
  } catch (err) {
    alert('Error: ' + err.message);
    btnGenerateText.textContent = 'Download PPT';
    btnGeneratePpt.disabled = false;
  }
});

// ── Theme Toggle (Light / Dark) ─────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('ppt_maker_theme') || 'light';
  applyTheme(saved);
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeMoonIcon.innerHTML = `
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2"/>
      <path d="M12 20v2"/>
      <path d="m4.93 4.93 1.41 1.41"/>
      <path d="m17.66 17.66 1.41 1.41"/>
      <path d="M2 12h2"/>
      <path d="M20 12h2"/>
      <path d="m6.34 17.66-1.41 1.41"/>
      <path d="m19.07 4.93-1.41 1.41"/>
    `;
    localStorage.setItem('ppt_maker_theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeMoonIcon.innerHTML = `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`;
    localStorage.setItem('ppt_maker_theme', 'light');
  }
}

btnThemeToggle?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ── Settings & Live Sync Modal ───────────────────────────────────────────────
function closeSettingsModal() {
  if (modalSettings) modalSettings.style.display = 'none';
}

function openSettingsModal() {
  if (modalSettings) modalSettings.style.display = 'flex';
}

btnSettings?.addEventListener('click', openSettingsModal);
btnSyncPill?.addEventListener('click', openSettingsModal);
btnCloseSettings?.addEventListener('click', closeSettingsModal);
modalSettings?.addEventListener('click', (e) => {
  if (e.target === modalSettings) closeSettingsModal();
});

async function initConfig() {
  try {
    const cfg = await window.electronAPI.getConfig();
    if (cfg) {
      if (inputGithubRepo) inputGithubRepo.value = cfg.github_repo || '';
      if (inputGithubToken) inputGithubToken.value = cfg.github_token || '';
      if (checkboxAutoSync) checkboxAutoSync.checked = cfg.auto_sync !== false;
      if (!cfg.github_repo) {
        updateSyncPill({ status: 'no_repo', message: 'Set Repo' });
      }
    }
  } catch (err) {
    console.warn('Config load error:', err);
  }
}

function updateSyncPill(info) {
  if (!syncDot || !syncText) return;
  syncDot.className = 'sync-dot ' + (info.status || 'offline');
  if (info.status === 'synced') {
    syncText.textContent = 'Live Up to Date';
    btnSyncPill.title = `Synced from GitHub (${info.date ? new Date(info.date).toLocaleTimeString() : 'latest'}). Click to configure.`;
  } else if (info.status === 'syncing') {
    syncText.textContent = 'Syncing...';
    btnSyncPill.title = info.message || 'Checking GitHub repository...';
  } else if (info.status === 'no_repo') {
    syncText.textContent = 'Set GitHub Repo';
    btnSyncPill.title = 'Click to configure GitHub repo for live script sync.';
  } else {
    syncText.textContent = 'Offline / Local';
    btnSyncPill.title = 'Running local generator script. Click to check sync.';
  }
}

if (window.electronAPI?.onSyncStatus) {
  window.electronAPI.onSyncStatus((statusInfo) => {
    updateSyncPill(statusInfo);
  });
}

btnCheckSyncNow?.addEventListener('click', async () => {
  btnCheckSyncNow.disabled = true;
  btnCheckSyncNow.textContent = 'Checking…';
  try {
    const repo = inputGithubRepo.value.trim();
    const token = inputGithubToken ? inputGithubToken.value.trim() : '';
    await window.electronAPI.saveConfig({
      github_repo: repo,
      github_token: token,
      auto_sync: checkboxAutoSync.checked
    });
    const result = await window.electronAPI.checkSync();
    if (result && result.status === 'synced') {
      alert('Sync Successful! Latest generator logic is active.');
    } else if (result && result.status === 'no_repo') {
      alert('Please enter a GitHub repository (e.g. iamfaruk01/ppt-maker).');
    } else {
      alert('Sync status: ' + (result?.message || 'Using local script'));
    }
  } catch (err) {
    alert('Sync error: ' + err.message);
  } finally {
    btnCheckSyncNow.disabled = false;
    btnCheckSyncNow.textContent = 'Check Sync Now';
  }
});

btnSaveSettings?.addEventListener('click', async () => {
  const repo = inputGithubRepo.value.trim();
  const token = inputGithubToken ? inputGithubToken.value.trim() : '';
  const autoSync = checkboxAutoSync.checked;
  await window.electronAPI.saveConfig({
    github_repo: repo,
    github_token: token,
    auto_sync: autoSync
  });
  closeSettingsModal();
  if (repo) {
    window.electronAPI.checkSync();
  }
});

btnInstallFont?.addEventListener('click', async () => {
  btnInstallFont.disabled = true;
  btnInstallFont.textContent = 'Installing…';
  try {
    const res = await window.electronAPI.installFont();
    alert(res && res.success ? 'Banikanta font installation triggered.' : 'Notice: ' + (res?.error || 'Done'));
  } catch (err) {
    alert('Font installation error: ' + err.message);
  } finally {
    btnInstallFont.disabled = false;
    btnInstallFont.textContent = 'Re-install Font';
  }
});

// ── Startup ──────────────────────────────────────────────────────────────────
initTheme();
initConfig();
// Pre-load default physics sample into textarea so step 2 is ready to try
textareaJson.value = JSON.stringify(EXAMPLE_SETS.physics, null, 2);
parseAndLoad(textareaJson.value);
// But keep Step 1 open on initial page load matching the screenshot!
openStep(1);
