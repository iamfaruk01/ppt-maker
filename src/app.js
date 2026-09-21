// ── State ───────────────────────────────────────────────────────────────────
let questions = [createEmptyQuestion()];
let activePreviewIdx = 0;

function createEmptyQuestion() {
  return {
    id: Date.now() + Math.random(),
    question: '',
    is_mcq: false,
    options: ['', '', '', '']
  };
}

// ── DOM References ──────────────────────────────────────────────────────────
const qListEl         = document.getElementById('question-list');
const btnAdd          = document.getElementById('btn-add-q');
const btnGenerate     = document.getElementById('btn-generate');
const btnCopyPrompt   = document.getElementById('btn-copy-prompt');
const btnOpenFile     = document.getElementById('btn-open-file');
const inputFile       = document.getElementById('input-file');
const btnPasteJson    = document.getElementById('btn-paste-json');
const btnSaveFile     = document.getElementById('btn-save-file');
const selectExample   = document.getElementById('select-example');
const btnLoadExample  = document.getElementById('btn-load-example');
const inputSubject    = document.getElementById('input-subject');
const inputExamLabel  = document.getElementById('input-exam-label');

// Preview Elements
const previewTitle    = document.getElementById('preview-title');
const slideCanvas     = document.getElementById('slide-canvas');
const slideQContent   = document.getElementById('slide-q-content');
const slideOptsCont   = document.getElementById('slide-opts-container');
const slideFooterNum  = document.getElementById('slide-footer-num');

// Modal Elements: Paste JSON
const modalPaste      = document.getElementById('modal-paste');
const btnClosePaste   = document.getElementById('btn-close-paste');
const btnCancelPaste  = document.getElementById('btn-cancel-paste');
const btnApplyPaste   = document.getElementById('btn-apply-paste');
const textareaPaste   = document.getElementById('textarea-paste');

// Modal Elements: Settings & Sync
const btnSettings     = document.getElementById('btn-settings');
const btnSyncPill     = document.getElementById('btn-sync-pill');
const syncDot         = document.getElementById('sync-dot');
const syncText        = document.getElementById('sync-text');
const modalSettings   = document.getElementById('modal-settings');
const btnCloseSettings= document.getElementById('btn-close-settings');
const inputGithubRepo = document.getElementById('input-github-repo');
const inputGithubToken= document.getElementById('input-github-token');
const checkboxAutoSync= document.getElementById('checkbox-auto-sync');
const btnCheckSyncNow = document.getElementById('btn-check-sync-now');
const btnSaveSettings = document.getElementById('btn-save-settings');
const btnInstallFont  = document.getElementById('btn-install-font');

// ── Helper Utilities ────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

// ── Render Question List ─────────────────────────────────────────────────────
function renderList() {
  qListEl.innerHTML = '';
  questions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = `q-card ${idx === activePreviewIdx ? 'q-card-active' : ''}`;
    card.innerHTML = `
      <div class="q-card-header">
        <span class="q-badge">Question ${idx + 1}</span>
        ${questions.length > 1 ? `<button class="btn-remove-q" data-idx="${idx}" title="Remove question">✕</button>` : ''}
      </div>

      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div class="q-field-label">
          <span>Question Statement</span>
          <span class="q-field-hint">LaTeX: $...$ inline, $$...$$ block</span>
        </div>
        <textarea class="q-textarea" data-idx="${idx}" rows="4"
          placeholder="Enter Assamese and/or English question statement with LaTeX math...">${escHtml(q.question)}</textarea>
      </div>

      <label class="mcq-toggle-row">
        <input type="checkbox" class="mcq-toggle" data-idx="${idx}" ${q.is_mcq ? 'checked' : ''}>
        <span>Multiple Choice Question (MCQ)</span>
      </label>

      ${q.is_mcq ? `
        <div class="options-grid">
          ${['A', 'B', 'C', 'D'].map((lbl, oi) => `
            <div class="option-row">
              <span class="opt-letter">${lbl}</span>
              <input type="text" class="opt-input" data-idx="${idx}" data-opt="${oi}"
                placeholder="Option ${lbl} (LaTeX supported)" value="${escHtml(q.options[oi] || '')}">
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    card.addEventListener('focusin', () => {
      if (activePreviewIdx !== idx) {
        activePreviewIdx = idx;
        highlightActiveCard();
        updatePreview();
      }
    });

    qListEl.appendChild(card);
  });

  // Bind Listeners
  qListEl.querySelectorAll('.btn-remove-q').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = parseInt(btn.dataset.idx, 10);
      if (questions.length > 1) {
        questions.splice(i, 1);
        if (activePreviewIdx >= questions.length) {
          activePreviewIdx = Math.max(0, questions.length - 1);
        }
        renderList();
      }
    });
  });

  qListEl.querySelectorAll('.q-textarea').forEach(ta => {
    ta.addEventListener('input', () => {
      questions[+ta.dataset.idx].question = ta.value;
      activePreviewIdx = +ta.dataset.idx;
      highlightActiveCard();
      updatePreview();
    });
  });

  qListEl.querySelectorAll('.mcq-toggle').forEach(cb => {
    cb.addEventListener('change', () => {
      questions[+cb.dataset.idx].is_mcq = cb.checked;
      activePreviewIdx = +cb.dataset.idx;
      renderList();
    });
  });

  qListEl.querySelectorAll('.opt-input').forEach(inp => {
    inp.addEventListener('input', () => {
      questions[+inp.dataset.idx].options[+inp.dataset.opt] = inp.value;
      activePreviewIdx = +inp.dataset.idx;
      updatePreview();
    });
  });

  updatePreview();
}

function highlightActiveCard() {
  const cards = qListEl.querySelectorAll('.q-card');
  cards.forEach((c, idx) => {
    if (idx === activePreviewIdx) {
      c.classList.add('q-card-active');
    } else {
      c.classList.remove('q-card-active');
    }
  });
}

// ── Preview Renderer ─────────────────────────────────────────────────────────
function updatePreview() {
  if (!slideCanvas) return;
  const q = questions[activePreviewIdx] || questions[0];
  previewTitle.textContent = `SLIDE PREVIEW (Q${activePreviewIdx + 1})`;
  slideFooterNum.textContent = `${activePreviewIdx + 1}`;

  if (!q || !q.question.trim()) {
    slideQContent.innerHTML = '<span style="color: #667; font-style: italic;">(Empty question statement. Type in the editor on the left to see live preview.)</span>';
    slideOptsCont.innerHTML = '';
    return;
  }

  // Split lines / paragraphs
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

  // Render MCQ Options
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

  // Trigger MathJax typesetting if loaded
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise([slideCanvas]).catch(() => {});
  }
}

// ── Add Question ─────────────────────────────────────────────────────────────
btnAdd?.addEventListener('click', () => {
  questions.push(createEmptyQuestion());
  activePreviewIdx = questions.length - 1;
  renderList();
  qListEl.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
});

// ── Multi-Subject Example Presets ────────────────────────────────────────────
const EXAMPLE_SETS = {
  physics: [
    {
      id: 101,
      question: `একটি বস্তুৰ ভৰ $m = 2$ kg আৰু বেগ $v = 10$ m/s। বস্তুটোৰ গতিশক্তি নির্ণয় কৰা।\n\nA body of mass $m = 2$ kg moves with velocity $v = 10$ m/s. Find its kinetic energy using:\n\n$$KE = \\frac{1}{2}mv^2$$`,
      is_mcq: true,
      options: ['100 J', '50 J', '200 J', '25 J']
    },
    {
      id: 102,
      question: `এটা $q = 1.6 \\times 10^{-19}$ C আধান $v = 2 \\times 10^6$ m/s বেগেৰে $B = 0.5$ T চুম্বক ক্ষেত্ৰৰ লম্বভাৱে গতি কৰিছে। আধানটোৰ ওপৰত ক্ৰিয়া কৰা চুম্বকীয় বল কিমান?\n\nA charge $q = 1.6 \\times 10^{-19}$ C moves with velocity $v = 2 \\times 10^6$ m/s perpendicular to a magnetic field $B = 0.5$ T. Find the magnetic force acting on it:  $F = qvB\\sin\\theta$`,
      is_mcq: true,
      options: ['$1.6 \\times 10^{-13}$ N', '$3.2 \\times 10^{-13}$ N', '$0.8 \\times 10^{-13}$ N', '0 N']
    }
  ],
  chemistry: [
    {
      id: 201,
      question: `$T = 300$ K উষ্ণতাত আৰু $V = 10$ L আয়তনত $n = 2$ ম'ল আদৰ্শ গেছৰ চাপ নিৰ্ণয় কৰা। ($R = 0.0821$ L·atm/(mol·K))\n\nFind the pressure of $n = 2$ moles of an ideal gas at temperature $T = 300$ K occupying a volume of $V = 10$ L using:\n\n$$PV = nRT$$`,
      is_mcq: true,
      options: ['4.92 atm', '2.46 atm', '9.84 atm', '1.23 atm']
    },
    {
      id: 202,
      question: `এটা জলীয় দ্ৰৱত হাইড্ৰ'নিয়াম আয়নৰ গাঢ়তা $[H^+] = 1.0 \\times 10^{-4}$ M হ'লে দ্ৰৱটোৰ $pH$ কিমান হ'ব?\n\nIf the hydrogen ion concentration in an aqueous solution is $[H^+] = 1.0 \\times 10^{-4}$ M, calculate the $pH$ of the solution:\n\n$$pH = -\\log_{10}[H^+]$$`,
      is_mcq: true,
      options: ['4', '10', '7', '14']
    }
  ],
  maths: [
    {
      id: 301,
      question: `তলৰ নিৰ্দিষ্ট সমাকলনটোৰ মান নিৰ্ণয় কৰা:\n\nEvaluate the following definite integral:\n\n$$\\int_{0}^{2} (3x^2 + 2x + 1) \\, dx$$`,
      is_mcq: true,
      options: ['14', '12', '16', '10']
    },
    {
      id: 302,
      question: `দ্বিঘাত সমীকৰণ $2x^2 - 5x + 2 = 0$ ৰ মূল দুটা নিৰ্ণয় কৰা:\n\nFind the roots of the quadratic equation $2x^2 - 5x + 2 = 0$ using the quadratic formula:\n\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$`,
      is_mcq: true,
      options: ['$x = 2, \\frac{1}{2}$', '$x = 1, 2$', '$x = -2, -\\frac{1}{2}$', '$x = 3, \\frac{1}{3}$']
    }
  ]
};

btnLoadExample?.addEventListener('click', () => {
  const mode = selectExample?.value || 'all';
  if (mode === 'physics') {
    inputSubject.value = 'Physics';
    inputExamLabel.value = 'Class XI · Physics';
    questions = JSON.parse(JSON.stringify(EXAMPLE_SETS.physics));
  } else if (mode === 'chemistry') {
    inputSubject.value = 'Chemistry';
    inputExamLabel.value = 'Class XII · Chemistry';
    questions = JSON.parse(JSON.stringify(EXAMPLE_SETS.chemistry));
  } else if (mode === 'maths') {
    inputSubject.value = 'Mathematics';
    inputExamLabel.value = 'Class XII · Mathematics';
    questions = JSON.parse(JSON.stringify(EXAMPLE_SETS.maths));
  } else {
    inputSubject.value = 'Science & Mathematics';
    inputExamLabel.value = 'Model Exam · 2025';
    questions = [
      ...JSON.parse(JSON.stringify(EXAMPLE_SETS.physics)),
      ...JSON.parse(JSON.stringify(EXAMPLE_SETS.chemistry)),
      ...JSON.parse(JSON.stringify(EXAMPLE_SETS.maths))
    ];
  }
  activePreviewIdx = 0;
  renderList();
});

// ── Copy AI Prompt ───────────────────────────────────────────────────────────
const AI_CONVERSION_PROMPT = `You are an expert Science & Mathematics question paper extractor and formatter.
Analyze the provided document (PDF, exam paper images, or raw text) containing multiple questions (e.g. 5 to 100 questions).

### OUTPUT FORMAT REQUIREMENT (COPY CODE MODE):
- Output your ENTIRE response inside a SINGLE markdown code block:
\`\`\`json
{
  "subject": "Physics",
  "exam_label": "Class XII · Final Exam 2025",
  "questions": [ ... ]
}
\`\`\`
- Do NOT output any introductory text, greetings, explanations, or notes before or after the code block.
- Start directly with \`\`\`json and end directly with \`\`\` so I can click the "Copy code" button to copy the whole JSON file in one click.

---

### CRITICAL RULES TO AVOID MISTAKES:

1. EXTRACT ALL QUESTIONS (NO TRUNCATION):
   - Extract EVERY question from the entire document from Q1 to the final question into the "questions" array.
   - NEVER truncate, summarize, or stop after a few questions.

2. JSON ESCAPING FOR LATEX (CRITICAL):
   - All LaTeX backslashes inside JSON strings MUST be escaped with a double backslash (\\\\).
   - Write: \\\\frac{1}{2}, \\\\times, \\\\cdot, \\\\theta, \\\\sin, \\\\cos, \\\\alpha, \\\\beta, \\\\int, \\\\pm.
   - ❌ WRONG: "\\frac{1}{2}" (breaks JSON syntax)
   - ✅ CORRECT: "\\\\frac{1}{2}"

3. MATH DELIMITERS:
   - Use $...$ for inline formulas (e.g. $m = 2$ kg, $v = 10$ m/s, $q = 1.6 \\\\times 10^{-19}$ C, $F = qvB\\\\sin\\\\theta$).
   - Use $$...$$ on its own line for standalone display formulas (e.g. $$KE = \\\\frac{1}{2}mv^2$$, $$\\int_0^2 (3x^2 + 2x + 1) dx$$).

4. BILINGUAL QUESTIONS:
   - Put the Assamese (or regional language) question first.
   - Follow it with two newlines (\\n\\n).
   - Then put the English version.
   - If the source is only in one language (English or Assamese), preserve that language.

5. MCQ OPTIONS (CLEAN VALUES ONLY):
   - Set "is_mcq": true and provide exactly 4 options in "options": ["...", "...", "...", "..."].
   - Provide ONLY the option value/formula. Do NOT include option letter prefixes!
   - ❌ WRONG: "options": ["(A) 100 J", "(B) 50 J", "(C) 200 J", "(D) 25 J"]
   - ❌ WRONG: "options": ["A. 100 J", "B. 50 J", "C. 200 J", "D. 25 J"]
   - ✅ CORRECT: "options": ["100 J", "50 J", "200 J", "25 J"]

6. NON-MCQ / SUBJECTIVE QUESTIONS:
   - Set "is_mcq": false and "options": [].

7. NO ANSWERS OR KEYS:
   - Do NOT include correct answers, checkmarks, solutions, or answer keys anywhere.
   - Do NOT include an "answer" or "correct_answer" field.

8. ABSOLUTELY NO CITATIONS OR GROUNDING MARKS:
   - Do NOT include any citations, source tags, or grounding markers like [cite: 1], [cite: 1, 2], [citation: ...], or footnotes.
   - Strip all citation markers from the source document completely. Output only pure question text and math.

---

### EXAMPLE FORMAT:

\`\`\`json
{
  "subject": "Physics",
  "exam_label": "Class XII · Final Exam 2025",
  "questions": [
    {
      "question": "এটা $q = 1.6 \\\\times 10^{-19}$ C আধান $v = 2 \\\\times 10^6$ m/s বেগেৰে $B = 0.5$ T চুম্বক ক্ষেত্ৰৰ লম্বভাৱে গতি কৰিছে। আধানটোৰ ওপৰত ক্ৰিয়া কৰা চুম্বকীয় বল কিমান?\\n\\nA charge $q = 1.6 \\\\times 10^{-19}$ C moves with velocity $v = 2 \\\\times 10^6$ m/s perpendicular to a magnetic field $B = 0.5$ T. Find the magnetic force acting on it:  $F = qvB\\\\sin\\\\theta$",
      "is_mcq": true,
      "options": [
        "$1.6 \\\\times 10^{-13}$ N",
        "$3.2 \\\\times 10^{-13}$ N",
        "$0.8 \\\\times 10^{-13}$ N",
        "0 N"
      ]
    },
    {
      "question": "একটি বস্তুৰ ভৰ $m = 2$ kg আৰু বেগ $v = 10$ m/s। বস্তুটোৰ গতিশক্তি নির্ণয় কৰা।\\n\\nA body of mass $m = 2$ kg moves with velocity $v = 10$ m/s. Find its kinetic energy using:\\n\\n$$KE = \\\\frac{1}{2}mv^2$$",
      "is_mcq": true,
      "options": [
        "100 J",
        "50 J",
        "200 J",
        "25 J"
      ]
    },
    {
      "question": "তলৰ নিৰ্দিষ্ট সমাকলনটোৰ মান নিৰ্ণয় কৰা:\\n\\nEvaluate the following definite integral:\\n\\n$$\\\\int_{0}^{2} (3x^2 + 2x + 1) \\\\, dx$$",
      "is_mcq": false,
      "options": []
    }
  ]
}
\`\`\`
`;

btnCopyPrompt?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(AI_CONVERSION_PROMPT);
    const origHtml = btnCopyPrompt.innerHTML;
    btnCopyPrompt.innerHTML = '<span>✓</span> Copied to Clipboard!';
    setTimeout(() => { btnCopyPrompt.innerHTML = origHtml; }, 2200);
  } catch (err) {
    alert('Could not copy to clipboard: ' + err.message);
  }
});

// ── Unified JSON Parser ───────────────────────────────────────────────────────
function loadQuestionsFromJson(rawText) {
  if (!rawText || !rawText.trim()) {
    throw new Error('JSON content is empty.');
  }
  const clean = rawText.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (e1) {
    // Auto-repair unescaped LaTeX backslashes if AI didn't double-escape
    try {
      const repaired = clean.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
      parsed = JSON.parse(repaired);
    } catch (e2) {
      throw new Error('Invalid JSON syntax. Please check for missing brackets or unescaped quotes.');
    }
  }

  let rawQuestions = [];
  let subject = '';
  let examLabel = '';

  if (Array.isArray(parsed)) {
    rawQuestions = parsed;
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.questions)) {
      rawQuestions = parsed.questions;
    }
    if (parsed.subject) subject = String(parsed.subject);
    if (parsed.exam_label) examLabel = String(parsed.exam_label);
  }

  if (!rawQuestions || rawQuestions.length === 0) {
    throw new Error('No questions found! JSON must contain a "questions" array or an array of question objects.');
  }

  if (subject && inputSubject) inputSubject.value = subject;
  if (examLabel && inputExamLabel) inputExamLabel.value = examLabel;

  questions = rawQuestions.map((q, idx) => {
    let opts = Array.isArray(q.options) ? q.options.map(o => stripCitations(o)) : [];
    // Strip accidental "(A) ", "A. ", "A) " prefixes
    opts = opts.map(o => o.replace(/^\(?[A-Da-d]\)?[\.\:\)]\s*/, ''));
    const isMcq = Boolean(q.is_mcq || opts.some(o => o.trim()));
    while (opts.length < 4) opts.push('');
    return {
      id: Date.now() + idx + Math.random(),
      question: stripCitations(q.question || ''),
      is_mcq: isMcq,
      options: opts.slice(0, 4)
    };
  });

  activePreviewIdx = 0;
  renderList();
  return questions.length;
}

// ── Open JSON File ────────────────────────────────────────────────────────────
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
      const count = loadQuestionsFromJson(evt.target.result);
      alert(`Successfully loaded ${count} questions from "${file.name}"!`);
    } catch (err) {
      alert('Failed to load JSON file:\n' + err.message);
    }
  };
  reader.onerror = () => {
    alert('Error reading file: ' + (reader.error?.message || 'Unknown error'));
  };
  reader.readAsText(file, 'UTF-8');
});

// ── Save JSON File ────────────────────────────────────────────────────────────
btnSaveFile?.addEventListener('click', () => {
  const validQs = questions.filter(q => q.question.trim());
  if (validQs.length === 0) {
    alert('No questions to save.');
    return;
  }
  const exportData = {
    subject: inputSubject?.value.trim() || 'Physics',
    exam_label: inputExamLabel?.value.trim() || '',
    questions: validQs.map(q => ({
      question: stripCitations(q.question),
      is_mcq: q.is_mcq,
      options: q.is_mcq ? q.options.map(o => stripCitations(o)) : []
    }))
  };
  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
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

// ── Paste JSON Modal Handlers ────────────────────────────────────────────────
function closePasteModal() {
  if (modalPaste) modalPaste.style.display = 'none';
}

btnPasteJson?.addEventListener('click', () => {
  if (modalPaste) {
    modalPaste.style.display = 'flex';
    if (textareaPaste) {
      textareaPaste.value = '';
      setTimeout(() => textareaPaste.focus(), 50);
    }
  }
});

btnClosePaste?.addEventListener('click', closePasteModal);
btnCancelPaste?.addEventListener('click', closePasteModal);
modalPaste?.addEventListener('click', (e) => {
  if (e.target === modalPaste) closePasteModal();
});

btnApplyPaste?.addEventListener('click', () => {
  const raw = textareaPaste?.value.trim() || '';
  if (!raw) {
    alert('Please paste JSON text first.');
    return;
  }
  try {
    const count = loadQuestionsFromJson(raw);
    closePasteModal();
  } catch (err) {
    alert('JSON Parse Error:\n' + err.message);
  }
});

// ── Generate PowerPoint Presentation ─────────────────────────────────────────
btnGenerate?.addEventListener('click', async () => {
  const validQs = questions.filter(q => q.question.trim());
  if (validQs.length === 0) {
    alert('Please enter at least one question before generating.');
    return;
  }

  // Ask for output folder
  let saveDir;
  try {
    saveDir = await window.electronAPI.selectDirectory({ title: 'Select Output Folder for PowerPoint' });
  } catch (e) {
    console.error('Directory picker error:', e);
  }
  if (!saveDir) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const subClean = (inputSubject?.value.trim() || 'Questions').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fullPath = `${saveDir}\\${subClean}_${timestamp}.pptx`;

  btnGenerate.disabled = true;
  const origBtnText = btnGenerate.innerHTML;
  btnGenerate.innerHTML = '<span>⏳</span> Generating PowerPoint...';

  const payload = {
    subject: inputSubject?.value.trim() || 'Physics',
    exam_label: inputExamLabel?.value.trim() || '',
    questions: validQs.map(q => ({
      question: stripCitations(q.question),
      is_mcq: q.is_mcq,
      options: q.is_mcq ? q.options.map(o => stripCitations(o)) : []
    })),
    _output: fullPath
  };

  try {
    const result = await window.electronAPI.mathPptGenerate(payload);
    if (result && result.success) {
      btnGenerate.innerHTML = '<span>✓</span> Generated Successfully!';
      // Reveal in file explorer
      await window.electronAPI.showInFolder(result.output);
      setTimeout(() => {
        btnGenerate.innerHTML = origBtnText;
        btnGenerate.disabled = false;
      }, 3500);
    } else {
      alert('PowerPoint Generation Error:\n' + (result?.error || 'Unknown generation failure.'));
      btnGenerate.innerHTML = origBtnText;
      btnGenerate.disabled = false;
    }
  } catch (err) {
    alert('Execution Error: ' + err.message);
    btnGenerate.innerHTML = origBtnText;
    btnGenerate.disabled = false;
  }
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

// Load Config
async function initConfig() {
  try {
    const cfg = await window.electronAPI.getConfig();
    if (cfg) {
      if (inputGithubRepo) inputGithubRepo.value = cfg.github_repo || '';
      if (inputGithubToken) inputGithubToken.value = cfg.github_token || '';
      if (checkboxAutoSync) checkboxAutoSync.checked = cfg.auto_sync !== false;
      if (!cfg.github_repo) {
        updateSyncPill({ status: 'no_repo', message: 'Click to Set GitHub Repo' });
      }
    }
  } catch (err) {
    console.warn('Failed to load initial config:', err);
  }
}

function updateSyncPill(info) {
  if (!syncDot || !syncText) return;
  syncDot.className = 'sync-dot ' + (info.status || 'offline');
  if (info.status === 'synced') {
    syncText.textContent = 'Live Up to Date ✓';
    btnSyncPill.title = `Synced from GitHub (${info.date ? new Date(info.date).toLocaleTimeString() : 'latest'}). Click to configure.`;
  } else if (info.status === 'syncing') {
    syncText.textContent = 'Syncing...';
    btnSyncPill.title = info.message || 'Checking GitHub raw repository...';
  } else if (info.status === 'no_repo') {
    syncText.textContent = 'Set GitHub Repo';
    btnSyncPill.title = 'Click to connect your GitHub repository for instant live updates.';
  } else {
    syncText.textContent = 'Offline / Local';
    btnSyncPill.title = 'Running bundled generator script. Click to check sync.';
  }
}

// IPC listener for background sync updates
if (window.electronAPI?.onSyncStatus) {
  window.electronAPI.onSyncStatus((statusInfo) => {
    updateSyncPill(statusInfo);
  });
}

btnCheckSyncNow?.addEventListener('click', async () => {
  btnCheckSyncNow.disabled = true;
  btnCheckSyncNow.textContent = 'Checking…';
  try {
    // Save current repo field first
    const repo = inputGithubRepo.value.trim();
    const token = inputGithubToken ? inputGithubToken.value.trim() : '';
    await window.electronAPI.saveConfig({
      github_repo: repo,
      github_token: token,
      auto_sync: checkboxAutoSync.checked
    });
    const result = await window.electronAPI.checkSync();
    if (result && result.status === 'synced') {
      alert('Sync Successful! Generator logic is now running the latest version from GitHub.');
    } else if (result && result.status === 'no_repo') {
      alert('Please enter a valid GitHub repository in the format "username/repo" or full URL.');
    } else {
      alert('Sync checked: ' + (result?.message || 'Using local script'));
    }
  } catch (err) {
    alert('Sync check failed: ' + err.message);
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
    if (res && res.success) {
      alert('Banikanta font installation command executed successfully.');
    } else {
      alert('Font installation note:\n' + (res?.error || 'Completed'));
    }
  } catch (err) {
    alert('Font installation error: ' + err.message);
  } finally {
    btnInstallFont.disabled = false;
    btnInstallFont.textContent = 'Re-install Font';
  }
});

// ── Startup ──────────────────────────────────────────────────────────────────
initConfig();
renderList();
