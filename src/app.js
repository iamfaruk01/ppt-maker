// ── AI Conversion Prompt ───────────────────────────────────────────────────
const AI_CONVERSION_PROMPT = `You are an expert bilingual educational content extractor, handwriting transcriber, and LaTeX mathematician specializing in bilingual Assamese and English question papers and notes.
Extract all content (bilingual question papers, handwritten notes, textbook pages, or study materials) from the provided PDF, image, or text.
CRITICAL MANDATE: If the source contains BOTH English and Assamese (or regional text), YOU MUST EXTRACT BOTH LANGUAGES. NEVER DROP, SKIP, OR SUMMARIZE THE ASSAMESE SCRIPT!

Output ONLY a valid JSON object in the following format:

{
  "subject": "<Subject Name, e.g. Physics / Mathematics / Chemistry / Biology>",
  "exam_label": "<Chapter / Topic / Exam Label, e.g. Class 11 Physics · Motion in a Plane>",
  "questions": [
    {
      "id": 1,
      "type": "question",
      "year": "AHSEC 2022",
      "question": "What is projectile motion? Derive the expression for maximum height $H$. (প্ৰক্ষেপ্য গতি কি? সৰ্বোচ্চ উচ্চতা $H$ ৰ সমীকৰণ উলিওৱা।)",
      "is_mcq": true,
      "options": [
        "Motion in 1D (একমাত্ৰিক গতি)",
        "Motion in 2D (দ্বিমাত্ৰিক গতি)",
        "Motion in 3D (ত্ৰিমাত্ৰিক গতি)",
        "None of these (কোনোটো নহয়)"
      ],
      "answer": "b"
    },
    {
      "id": 2,
      "type": "question",
      "year": "JEE Main 2023",
      "question": "An object moves along $y = x - \\frac{x^2}{20}$. Find the angle of projection. (বস্তু এটা $y = x - \\frac{x^2}{20}$ পথেৰে গতি কৰে। প্ৰক্ষেপ কোণ নিৰ্ণয় কৰা।)",
      "is_mcq": false,
      "options": [],
      "answer": "45°"
    },
    {
      "id": 3,
      "type": "note",
      "year": "",
      "question": "Law of Conservation of Momentum (ৰৈখিক ভৰবেগৰ সংৰক্ষণ সূত্ৰ):\\n• In an isolated system, total linear momentum remains constant.\\n• $m_1 u_1 + m_2 u_2 = m_1 v_1 + m_2 v_2$\\n• (বাহ্যিক বলৰ অনুপস্থিতিত এটা সংস্থাৰ মুঠ ৰৈখিক ভৰবেগ ধ্ৰুৱক থাকে।)",
      "is_mcq": false,
      "options": [],
      "answer": ""
    }
  ]
}

CRITICAL RULES:
1. Output your ENTIRE response inside a SINGLE markdown code block starting with \`\`\`json and ending with \`\`\`.
2. Do NOT write any conversational text, explanations, or notes before or after the code block.
3. MANDATORY BILINGUAL EXTRACTION (NEVER DROP ASSAMESE):
   - IF THE PDF/IMAGE CONTAINS BOTH ENGLISH AND ASSAMESE, YOU MUST EXTRACT BOTH LANGUAGES!
   - NEVER drop, skip, or summarize the Assamese text. Do not output English-only if the source has Assamese underneath or beside it.
   - Format questions as: English question text followed immediately by Assamese in parentheses:
     \`English question text (অসমীয়া প্ৰশ্নৰ পাঠ)\`
   - If MCQ options also have Assamese translations in the PDF, include both:
     \`English option (অসমীয়া বিকল্প)\`
   - Accurately transcribe all Assamese characters, conjuncts (যুক্তাক্ষৰ like ক্ত, প্ৰ, ষ্ট, ণ্ড, ত্ৰ, ক্ষ), and vowel diacritics (কাৰ/মাত্ৰা).
4. QUESTION PAPERS, MCQs & NUMERICAL PROBLEMS:
   - For questions, practice exercises, and exam problems, set "type": "question".
   - If multiple-choice (MCQ): set "is_mcq": true, provide clean values in "options" (never include "(A)", "A.", or "(B)" prefixes), and include the correct option in "answer" ("a", "b", "c", or "d").
   - If numerical / integer question (NO options): set "is_mcq": false, set "options": [], and put the numeric answer or solution value in "answer" (e.g. "25", "1.5", or "" if none).
5. EXAM YEAR & SOURCE TAGS:
   - If a question in the PDF/image has an exam name, year, or shift mentioned (e.g. "[JEE Main 2023]", "[NEET 2022]", "(CBSE 2020)", "[AHSEC 2019]"), ALWAYS extract it into the "year" field (e.g. "year": "AHSEC 2019").
6. HANDWRITTEN NOTES & THEORY:
   - Carefully decipher handwritten text, cursive, mathematical notations, and shorthand.
   - Expand common abbreviations (e.g. "w.r.t." -> "with respect to", "const." -> "constant", "temp." -> "temperature", "eqn" -> "equation") for professional presentation clarity.
   - Divide notes into logical slides: ONE core concept, law, definition, formula card, or derivation per slide (do not cram multiple unrelated topics onto a single slide).
   - For notes and theoretical topics, set "type": "note", "is_mcq": false, "options": [], and "answer": "". Start the "question" field with a clear topic heading followed by ":" or a newline.
7. MATHEMATICS & FORMULAS (LaTeX):
   - Escape all LaTeX backslashes inside JSON strings with double backslash (e.g. \\\\frac{a}{b}, \\\\sqrt{x}, \\\\vec{F}, \\\\sin^2\\\\theta, \\\\int, \\\\sum, \\\\oint, \\\\begin{bmatrix}).
   - ALWAYS wrap all mathematical expressions, formulas, symbols, units, and equations in standard LaTeX $...$ or $$...$$ (e.g. $F = ma$, $\\\\frac{1}{2}mv^2$, $9.8\\\\,\\\\mathrm{m/s^2}$, $\\\\lambda = \\\\frac{h}{p}$).
   - Keep complete equations together inside a single pair of $...$ (e.g. "$\\\\mu_s = 0.5$", "$m = 2\\\\,\\\\mathrm{kg}$") so they never break apart across lines.
   - Full standard LaTeX is supported: fractions (\\\\frac), radicals (\\\\sqrt), vectors (\\\\vec), subscripts/superscripts (x_1^2), matrices (\\\\begin{bmatrix}), cases (\\\\begin{cases}), limits (\\\\lim), integrals (\\\\int), summations (\\\\sum), and Greek letters (\\\\alpha, \\\\theta).
8. Never include citations like [cite: 1] or footnotes anywhere in the output.`;


// ── Sample Data ─────────────────────────────────────────────────────────────
const SAMPLE_PHYSICS = {
  subject: "Physics",
  exam_label: "Class XII · Final Exam 2025",
  questions: [
    {
      id: 1,
      question: "If the external force on a body is zero, then which of the following is zero?",
      is_mcq: true,
      options: [
        "Speed",
        "Acceleration",
        "Displacement",
        "Velocity"
      ],
      answer: "b"
    },
    {
      id: 2,
      question: "The dimensional formula of force is:",
      is_mcq: true,
      options: [
        "[M L T^-2]",
        "[M L^2 T^-2]",
        "[M T^-1]",
        "[M L T^-1]"
      ],
      answer: "a"
    },
    {
      id: 3,
      question: "A body of mass $m = 2$ kg moves with velocity $v = 10$ m/s. Find its kinetic energy (একটি বস্তুৰ ভৰ $m = 2$ kg আৰু বেগ $v = 10$ m/s। বস্তুটোৰ গতিশক্তি নির্ণয় কৰা): $$KE = \\frac{1}{2}mv^2$$",
      is_mcq: true,
      options: [
        "100 J",
        "50 J",
        "200 J",
        "25 J"
      ]
    }
  ]
};

// ── State ───────────────────────────────────────────────────────────────────
let questions = [];
let metaInfo = { subject: 'Physics', exam_label: 'Class XII · Final Exam 2025' };
let currentSlideIdx = 0;
let lastGeneratedFile = null;
let activeStep = 1;
let currentRawParsedObj = null;

// ── DOM References ──────────────────────────────────────────────────────────
// Views
const viewWizard          = document.getElementById('view-wizard');
const viewFullPreview     = document.getElementById('view-full-preview');
const headerWizardActions = document.getElementById('header-wizard-actions');
const headerPreviewActions= document.getElementById('header-preview-actions');

// Step Accordion
const stepCards           = [1, 2, 3].map(i => document.getElementById(`step-card-${i}`));
const stepHeaders         = [1, 2, 3].map(i => document.getElementById(`step-header-${i}`));
const stepTitle1          = document.getElementById('step-title-1');
const stepTitle2          = document.getElementById('step-title-2');
const stepTitle3          = document.getElementById('step-title-3');
const stepSubtitle1       = document.getElementById('step-subtitle-1');
const stepSubtitle2       = document.getElementById('step-subtitle-2');
const stepSubtitle3       = document.getElementById('step-subtitle-3');

// Step 1
const promptBoxText       = document.getElementById('prompt-box-text');
const btnCopyPrompt       = document.getElementById('btn-copy-prompt');

// Step 2
const textareaJson        = document.getElementById('textarea-json-input');
const btnQuickSample      = document.getElementById('btn-quick-sample');
const btnGenerateDirect   = document.getElementById('btn-generate-direct');
const btnGenerateDirectText = document.getElementById('btn-generate-direct-text');

// Step 3 Carousel
const btnPrevSlide        = document.getElementById('btn-prev-slide');
const btnNextSlide        = document.getElementById('btn-next-slide');
const slideCanvas         = document.getElementById('slide-canvas');
const slideExam           = document.getElementById('slide-exam');
const slideQHeading       = document.getElementById('slide-q-heading');
const slideQContent       = document.getElementById('slide-q-content');
const slideOptsCont       = document.getElementById('slide-opts-container');
const slideFooterSub      = document.getElementById('slide-footer-sub');
const slideFooterNum      = document.getElementById('slide-footer-num');
const carouselDotsRow     = document.getElementById('carousel-dots-row');

// Step 3 Stats & Actions
const statTotalSlides     = document.getElementById('stat-total-slides');
const statTotalQuestions  = document.getElementById('stat-total-questions');
const statSubject         = document.getElementById('stat-subject');
const statExam            = document.getElementById('stat-exam');
const btnDownloadFinal    = document.getElementById('btn-download-final');
const btnPreviewFull      = document.getElementById('btn-preview-full');

// Full Preview Mode Elements
const btnCloseFullPreview = document.getElementById('btn-close-full-preview');
const btnDownloadPreview  = document.getElementById('btn-download-preview');
const fullEditorLines     = document.getElementById('full-editor-lines');
const fullEditorCode      = document.getElementById('full-editor-code');
const fullSlideCanvas     = document.getElementById('full-slide-canvas');
const fullSlideExam       = document.getElementById('full-slide-exam');
const fullSlideQHeading   = document.getElementById('full-slide-q-heading');
const fullSlideQContent   = document.getElementById('full-slide-q-content');
const fullSlideOptsCont   = document.getElementById('full-slide-opts-container');
const fullSlideFooterSub  = document.getElementById('full-slide-footer-sub');
const fullSlideFooterNum  = document.getElementById('full-slide-footer-num');
const btnFullPrevSlide    = document.getElementById('btn-full-prev-slide');
const btnFullNextSlide    = document.getElementById('btn-full-next-slide');
const fullSlideCounter    = document.getElementById('full-slide-counter');
const btnSlideFloatPrev   = document.getElementById('btn-slide-float-prev');
const btnSlideFloatNext   = document.getElementById('btn-slide-float-next');
const fullCarouselDotsRow = document.getElementById('full-carousel-dots-row');

// Header & Settings
const btnSyncPill         = document.getElementById('btn-sync-pill');
const syncDot             = document.getElementById('sync-dot');
const syncText            = document.getElementById('sync-text');
const btnSettings         = document.getElementById('btn-settings');
const btnThemeToggle      = document.getElementById('btn-theme-toggle');
const themeMoonIcon       = document.getElementById('theme-moon-icon');

// Modal Settings
const modalSettings       = document.getElementById('modal-settings');
const btnCloseSettings    = document.getElementById('btn-close-settings');
const inputGithubRepo     = document.getElementById('input-github-repo');
const inputGithubToken    = document.getElementById('input-github-token');
const checkboxAutoSync    = document.getElementById('checkbox-auto-sync');
const btnCheckSyncNow     = document.getElementById('btn-check-sync-now');
const btnSaveSettings     = document.getElementById('btn-save-settings');
const btnInstallFont      = document.getElementById('btn-install-font');

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
      // Mark step 1 completed (green badge) and show subtitle (Screenshot 2)
      stepCards[0].classList.add('completed');
      if (stepSubtitle1) {
        stepSubtitle1.style.display = 'block';
        stepSubtitle1.textContent = 'Prompt copied! Now paste it into any AI and get the JSON.';
      }
      if (stepSubtitle2) {
        stepSubtitle2.style.display = 'block';
        stepSubtitle2.textContent = 'Paste the JSON generated by AI below.';
      }
      if (stepSubtitle3) {
        stepSubtitle3.style.display = 'block';
        stepSubtitle3.textContent = 'Your presentation will be ready to download.';
      }
      openStep(2);
      if (textareaJson) textareaJson.focus();
    }, 400);
  } catch (err) {
    alert('Clipboard error: ' + err.message);
  }
});

// ── Step 2: Presets & JSON Parsing ──────────────────────────────────────────
btnQuickSample?.addEventListener('click', () => {
  textareaJson.value = JSON.stringify(SAMPLE_PHYSICS, null, 2);
  if (stepSubtitle2) {
    stepSubtitle2.style.display = 'block';
    stepSubtitle2.textContent = 'JSON detected! Ready to generate your PPT.';
  }
  textareaJson.focus();
});

textareaJson?.addEventListener('input', () => {
  if (textareaJson.value.trim().length > 10) {
    if (stepSubtitle2) {
      stepSubtitle2.style.display = 'block';
      stepSubtitle2.textContent = 'JSON detected! Ready to generate your PPT.';
    }
  }
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

function normalizeMathFractions(str) {
  if (!str) return '';
  let s = String(str);
  // Parenthesized fraction: (m/a) -> \frac{m}{a}
  s = s.replace(/\(([a-zA-Z0-9_\+\-\*\^]+)\s*\/\s*([a-zA-Z0-9_\+\-\*\^]+)\)/g, '\\frac{$1}{$2}');
  // Simple fraction: preceded by space, =, (, [, +, -
  s = s.replace(/(?<=[=\s\+\-\(\[])([a-zA-Z0-9_]+)\s*\/\s*([a-zA-Z0-9_]+)(?=[\s\+\-\)\]\.,]|$)/g, '\\frac{$1}{$2}');
  // Standalone fraction: "m/a"
  s = s.replace(/^([a-zA-Z0-9_]+)\s*\/\s*([a-zA-Z0-9_]+)$/g, '\\frac{$1}{$2}');
  return s;
}

/**
 * Wraps bare LaTeX commands (\frac, \sqrt, \sum, \int, etc.) that appear
 * OUTSIDE of $...$ math delimiters in $...$, so MathJax renders them.
 *
 * Example: "v = 5 \frac{m}{s}" -> "v = 5 $\frac{m}{s}$"
 */
function wrapBareLatexCommands(str) {
  if (!str || !str.includes('\\')) return str;
  // Regex to find bare LaTeX commands outside $
  const BARE_LATEX = /\\(?:frac\{[^}]+\}\{[^}]+\}|binom\{[^}]+\}\{[^}]+\}|sqrt(?:\[[^\]]*\])?\{[^}]+\}|begin\{[a-zA-Z*]+\}[\s\S]*?end\{[a-zA-Z*]+\}|sum(?:_\{[^}]+\})?(?:\^\{[^}]+\})?|int(?:_\{[^}]+\})?(?:\^\{[^}]+\})?|prod(?:_\{[^}]+\})?(?:\^\{[^}]+\})?|(?:vec|hat|bar|overline|underline|overrightarrow|dot|ddot|tilde|breve|acute|grave|check|mathbf|mathrm|mathit|text)\{[^}]+\}|(?:sin|cos|tan|cot|sec|csc|log|ln|lg|lim|exp|arcsin|arccos|arctan)(?:\^\{[^}]+\}|\^[0-9a-zA-Z\+\-]+|_\{[^}]+\}|_[0-9a-zA-Z]+)*(?:\([^\)]+\))?(?:\s+[a-zA-Z0-9]+)?|[a-zA-Z]+(?:\^\{[^}]+\}|\^[0-9a-zA-Z\+\-]+|_\{[^}]+\}|_[0-9a-zA-Z]+)+|(?:alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|infty|propto|partial|nabla|degree|pm|mp|times|cdot|approx|neq|leq|geq|to|rightarrow|leftarrow))/g;
  // Split on existing $...$ segments so we don't double-wrap
  const parts = str.split(/(\$\$[\s\S]*?\$\$|\$[^$]+\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$')) return part; // already math, skip
    return part.replace(BARE_LATEX, m => `$${m}$`);
  }).join('');
}

function isMathExpression(str) {
  if (!str) return false;
  const s = String(str).trim();
  if (s.includes('$') || s.includes('\\')) return true;
  if (/[a-zA-Z]\s*=\s*[a-zA-Z0-9\+\-\*\/]/.test(s)) return true;
  if (/\b[a-zA-Z0-9_]+\s*\/\s*[a-zA-Z0-9_]+\b/.test(s)) return true;
  if (/\^\{?[0-9\+\-a-zA-Z]+\}?/.test(s)) return true;
  if (/\b(?:sin|cos|tan|log|ln|lim)\b/.test(s)) return true;
  return false;
}

function parseAndLoad(rawText) {
  if (!rawText || !rawText.trim()) return false;
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
      alert('Invalid JSON format. Please verify the JSON syntax.');
      return false;
    }
  }

  let rawQuestions = [];
  let subject = '';
  let examLabel = '';

  if (Array.isArray(parsed)) {
    rawQuestions = parsed;
    currentRawParsedObj = { questions: parsed };
  } else if (parsed && typeof parsed === 'object') {
    currentRawParsedObj = parsed;
    if (Array.isArray(parsed.questions)) rawQuestions = parsed.questions;
    if (parsed.subject) subject = String(parsed.subject);
    if (parsed.exam_label) examLabel = String(parsed.exam_label);
  }

  if (!rawQuestions || rawQuestions.length === 0) {
    alert('No questions array found in JSON. Expected: { "questions": [ ... ] }');
    return false;
  }

  questions = rawQuestions.map((q, idx) => {
    let opts = Array.isArray(q.options) ? q.options.map(o => stripCitations(o)) : [];
    opts = opts.map(o => o.replace(/^\(?[A-Da-d]\)?[\.\:\)]\s*/, ''));
    opts = opts.map(o => normalizeMathFractions(o));
    const isMcq = Boolean(q.is_mcq || opts.some(o => o.trim()));
    while (opts.length < 4) opts.push('');
    return {
      id: q.id !== undefined && q.id !== null ? q.id : idx + 1,
      type: q.type ? String(q.type).trim() : '',
      year: q.year ? String(q.year).trim() : '',
      question: normalizeMathFractions(stripCitations(q.question || '')),
      is_mcq: isMcq,
      options: opts.slice(0, 4),
      answer: q.answer !== undefined && q.answer !== null ? String(q.answer).trim() : ''
    };
  });

  metaInfo = {
    subject: subject || 'Physics',
    exam_label: examLabel || 'Class XII · 2025'
  };

  return metaInfo;
}

// ── PPT Generation Logic ────────────────────────────────────────────────────
async function triggerGenerate() {
  const text = textareaJson.value.trim();
  if (!text) {
    alert('Please paste your JSON text first.');
    return;
  }

  const parseResult = parseAndLoad(text);
  if (!parseResult) return;

  // Generate directly into app temporary / output directory
  const timestamp = Date.now();
  const subClean = (parseResult.subject || 'Presentation').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${subClean}_${timestamp}.pptx`;

  // Update button states
  if (btnGenerateDirect) btnGenerateDirect.disabled = true;
  if (btnGenerateDirectText) btnGenerateDirectText.textContent = 'Generating...';

  const payload = {
    subject: metaInfo.subject,
    exam_label: metaInfo.exam_label,
    questions: questions.map(q => ({
      id: q.id,
      type: q.type,
      year: q.year,
      question: q.question,
      is_mcq: q.is_mcq,
      options: q.is_mcq ? q.options : [],
      answer: q.answer
    }))
  };

  try {
    const result = await window.electronAPI.mathPptGenerate(payload);
    if (result && result.success) {
      lastGeneratedFile = result.output;

      // Mark Step 1 & 2 completed with green checkmarks (Screenshot 3)
      stepCards[0].classList.add('completed');
      if (stepSubtitle1) {
        stepSubtitle1.style.display = 'block';
        stepSubtitle1.textContent = 'Prompt copied! Now paste it into any AI and get the JSON.';
      }

      stepCards[1].classList.add('completed');
      if (stepTitle2) stepTitle2.textContent = '2. Paste JSON from AI';
      if (stepSubtitle2) {
        stepSubtitle2.style.display = 'block';
        stepSubtitle2.textContent = 'JSON detected! Ready to generate your PPT.';
      }

      // Step 3 active
      if (stepTitle3) stepTitle3.textContent = 'Download PPT';
      if (stepSubtitle3) {
        stepSubtitle3.style.display = 'block';
        stepSubtitle3.textContent = 'Your presentation is ready!';
      }

      // Populate Stats
      if (statTotalSlides) statTotalSlides.textContent = questions.length;
      if (statTotalQuestions) statTotalQuestions.textContent = questions.length;
      if (statSubject) statSubject.textContent = metaInfo.subject;
      if (statExam) statExam.textContent = metaInfo.exam_label;

      // Render carousel
      currentSlideIdx = 0;
      renderCarouselDots();
      renderSlide(0);

      // Open Step 3
      openStep(3);

    } else {
      alert('PowerPoint Generation Error:\n' + (result?.error || 'Unknown failure.'));
    }
  } catch (err) {
    alert('Generation error: ' + err.message);
  } finally {
    if (btnGenerateDirect) btnGenerateDirect.disabled = false;
    if (btnGenerateDirectText) btnGenerateDirectText.textContent = 'Generate PPT';
  }
}

btnGenerateDirect?.addEventListener('click', triggerGenerate);

// ── Slide Formatting & MathJax ──────────────────────────────────────────────
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

function formatQuestionHtml(rawQuestion, isNote = false) {
  if (!rawQuestion) return '';
  const normalizedQ = wrapBareLatexCommands(normalizeMathFractions(rawQuestion));
  const paragraphs = normalizedQ.split(/\n\s*\n/);
  let contentHtml = '';
  let lineIdx = 0;

  paragraphs.forEach((p) => {
    const lines = p.split('\n');
    lines.forEach((line) => {
      const segs = parseSegments(line);
      let lineHtml = '';
      segs.forEach(([type, content]) => {
        if (type === 'text') {
          const mYr = content.match(/(\s*\[[^\]]*(?:19|20)\d\d[^\]]*\]|\s*\[(?:JEE|NEET|CBSE|AHSEC|IIT|AIEEE|Board|PYQ)[^\]]*\]|\s*\((?:19|20)\d\d\))\s*$/i);
          if (mYr) {
            const pre = content.slice(0, mYr.index);
            const yr = mYr[1].trim();
            lineHtml += escHtml(pre) + ` <b style="color: var(--accent-teal, #63CAB7); font-weight: 700;">${escHtml(yr)}</b>`;
          } else {
            lineHtml += escHtml(content);
          }
        } else if (type === 'inline') {
          lineHtml += `<span class="slide-math-inline">\\(${escHtml(content)}\\)</span>`;
        } else if (type === 'display') {
          lineHtml += `<div class="slide-math-display">\\[${escHtml(content)}\\]</div>`;
        }
      });
      const isTitleLine = (isNote && lineIdx === 0);
      lineIdx++;
      if (isTitleLine) {
        contentHtml += `<div style="color: var(--accent-teal, #63CAB7); font-weight: 700; font-size: 1.18rem; margin-bottom: 10px;">${lineHtml || '&nbsp;'}</div>`;
      } else {
        contentHtml += `<div>${lineHtml || '&nbsp;'}</div>`;
      }
    });
    contentHtml += '<div style="height: 6px;"></div>';
  });
  return contentHtml;
}

function formatOptionsHtml(q) {
  if (!q.is_mcq || !q.options || !q.options.some(o => o && o.trim())) {
    return '';
  }
  let optsHtml = '';
  const labels = ['(a)', '(b)', '(c)', '(d)'];
  labels.forEach((lbl, i) => {
    let rawVal = q.options[i] ? q.options[i].trim() : '';
    if (!rawVal) return;
    let optVal = wrapBareLatexCommands(normalizeMathFractions(rawVal));
    if (!optVal.includes('$') && isMathExpression(optVal)) {
      optVal = `$${optVal}$`;
    }
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
        <b>${lbl}</b>
        <span>${optTextHtml}</span>
      </div>
    `;
  });
  return optsHtml;
}

function renderSlide(idx) {
  if (!questions || questions.length === 0) return;
  if (idx < 0) idx = 0;
  if (idx >= questions.length) idx = questions.length - 1;
  currentSlideIdx = idx;

  const q = questions[idx];
  const qType = String(q.type || '').trim().toLowerCase();
  let isNote = false;
  if (qType === 'note' || q.is_note === true) {
    isNote = true;
  } else if (['question', 'numerical', 'integer', 'subjective', 'problem', 'exercise'].includes(qType)) {
    isNote = false;
  } else if (!q.is_mcq && (!q.options || q.options.length === 0)) {
    const rawQ = q.question || '';
    const hasBullets = /(?:^|\n)\s*[•\-\*]/.test(rawQ);
    const hasTitleColon = /^[A-Z][A-Za-z0-9\s,&'\-()]+\s*:\s*(?:\n|$)/.test(rawQ);
    const hasQuestionMarks = rawQ.includes('?') || /^\s*(?:Q(?:uestion)?\s*\d+|\d+[\.:\-\)])/i.test(rawQ);
    isNote = (hasBullets || hasTitleColon) && !hasQuestionMarks;
  }
  let questionText = q.question || '';
  const yearTag = (q.year || '').trim();
  const cleanYear = yearTag.replace(/^[\[\(]+|[\]\)]+$/g, '').trim();
  if (cleanYear && !questionText.includes(cleanYear)) {
    questionText = `${questionText.trim()} [${cleanYear}]`;
  }
  const qHtml = formatQuestionHtml(questionText, isNote);
  const optsHtml = formatOptionsHtml(q);

  const examDisplay = '';

  // Step 3 Carousel Slide
  if (slideCanvas) {
    if (slideExam) slideExam.textContent = examDisplay;
    if (slideQHeading) {
      if (isNote) {
        slideQHeading.textContent = `Note / Concept ${idx + 1}:`;
      } else if (qType === 'numerical') {
        slideQHeading.textContent = `Numerical Question ${idx + 1}:`;
      } else {
        slideQHeading.textContent = `Question ${idx + 1}:`;
      }
    }
    if (slideQContent) slideQContent.innerHTML = qHtml;
    if (slideOptsCont) slideOptsCont.innerHTML = optsHtml;
    if (slideFooterSub) slideFooterSub.textContent = metaInfo.subject || 'Physics';
    if (slideFooterNum) slideFooterNum.textContent = `${idx + 1} / ${questions.length}`;

    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([slideCanvas]).catch(() => {});
    }
  }

  // Full Preview Slide
  if (fullSlideCanvas) {
    if (fullSlideExam) fullSlideExam.textContent = examDisplay;
    if (fullSlideQHeading) {
      if (isNote) {
        fullSlideQHeading.textContent = `Note / Concept ${idx + 1}:`;
      } else if (qType === 'numerical') {
        fullSlideQHeading.textContent = `Numerical Question ${idx + 1}:`;
      } else {
        fullSlideQHeading.textContent = `Question ${idx + 1}:`;
      }
    }
    if (fullSlideQContent) fullSlideQContent.innerHTML = qHtml;
    if (fullSlideOptsCont) fullSlideOptsCont.innerHTML = optsHtml;
    if (fullSlideFooterSub) fullSlideFooterSub.textContent = metaInfo.subject || 'Physics';
    if (fullSlideFooterNum) fullSlideFooterNum.textContent = `${idx + 1} / ${questions.length}`;

    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([fullSlideCanvas]).catch(() => {});
    }
  }

  updateCarouselButtons();
}

function updateCarouselButtons() {
  const isFirst = currentSlideIdx === 0;
  const isLast = currentSlideIdx === questions.length - 1;

  if (btnPrevSlide) btnPrevSlide.disabled = isFirst;
  if (btnNextSlide) btnNextSlide.disabled = isLast;
  if (btnFullPrevSlide) btnFullPrevSlide.disabled = isFirst;
  if (btnFullNextSlide) btnFullNextSlide.disabled = isLast;
  if (btnSlideFloatPrev) btnSlideFloatPrev.disabled = isFirst;
  if (btnSlideFloatNext) btnSlideFloatNext.disabled = isLast;

  if (fullSlideCounter) {
    fullSlideCounter.textContent = `${currentSlideIdx + 1} / ${questions.length}`;
  }

  // Update dots active class
  document.querySelectorAll('.carousel-dot').forEach((dot) => {
    const dIdx = parseInt(dot.getAttribute('data-idx'), 10);
    if (dIdx === currentSlideIdx) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function renderCarouselDots() {
  const total = questions.length;
  let dotsHtml = '';
  for (let i = 0; i < total; i++) {
    dotsHtml += `<div class="carousel-dot ${i === currentSlideIdx ? 'active' : ''}" data-idx="${i}"></div>`;
  }

  if (carouselDotsRow) {
    carouselDotsRow.innerHTML = dotsHtml;
    carouselDotsRow.querySelectorAll('.carousel-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        renderSlide(parseInt(dot.getAttribute('data-idx'), 10));
      });
    });
  }

  if (fullCarouselDotsRow) {
    fullCarouselDotsRow.innerHTML = dotsHtml;
    fullCarouselDotsRow.querySelectorAll('.carousel-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        renderSlide(parseInt(dot.getAttribute('data-idx'), 10));
      });
    });
  }
}

// Carousel Nav Listeners
btnPrevSlide?.addEventListener('click', () => {
  if (currentSlideIdx > 0) renderSlide(currentSlideIdx - 1);
});

btnNextSlide?.addEventListener('click', () => {
  if (currentSlideIdx < questions.length - 1) renderSlide(currentSlideIdx + 1);
});

btnFullPrevSlide?.addEventListener('click', () => {
  if (currentSlideIdx > 0) renderSlide(currentSlideIdx - 1);
});

btnFullNextSlide?.addEventListener('click', () => {
  if (currentSlideIdx < questions.length - 1) renderSlide(currentSlideIdx + 1);
});

btnSlideFloatPrev?.addEventListener('click', () => {
  if (currentSlideIdx > 0) renderSlide(currentSlideIdx - 1);
});

btnSlideFloatNext?.addEventListener('click', () => {
  if (currentSlideIdx < questions.length - 1) renderSlide(currentSlideIdx + 1);
});

// Arrow Keys Navigation
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowLeft') {
    if (currentSlideIdx > 0) renderSlide(currentSlideIdx - 1);
  } else if (e.key === 'ArrowRight') {
    if (currentSlideIdx < questions.length - 1) renderSlide(currentSlideIdx + 1);
  }
});

// ── Download Presentation ───────────────────────────────────────────────────
async function handleDownloadPpt() {
  if (!lastGeneratedFile) {
    if (!questions.length) {
      alert('Please paste questions JSON and click Generate PPT first.');
      return;
    }
    await triggerGenerate();
    if (!lastGeneratedFile) return;
  }

  try {
    const subClean = (metaInfo.subject || 'Presentation').replace(/[^a-zA-Z0-9_-]/g, '_');
    const saveTarget = await window.electronAPI.saveFile({
      defaultPath: `${subClean}_${metaInfo.exam_label ? metaInfo.exam_label.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Slides'}.pptx`
    });

    if (saveTarget) {
      // Re-generate or copy to the chosen target path
      const payload = {
        subject: metaInfo.subject,
        exam_label: metaInfo.exam_label,
        questions: questions.map(q => ({
          id: q.id,
          type: q.type,
          year: q.year,
          question: q.question,
          is_mcq: q.is_mcq,
          options: q.is_mcq ? q.options : [],
          answer: q.answer
        })),
        _output: saveTarget
      };
      const res = await window.electronAPI.mathPptGenerate(payload);
      if (res && res.success) {
        await window.electronAPI.showInFolder(saveTarget);
      }
    } else {
      // Reveal the already generated file
      await window.electronAPI.showInFolder(lastGeneratedFile);
    }
  } catch (err) {
    alert('Error saving PPT: ' + err.message);
  }
}

btnDownloadFinal?.addEventListener('click', handleDownloadPpt);
btnDownloadPreview?.addEventListener('click', handleDownloadPpt);

// ── Full Preview Mode (Screenshot 4) ────────────────────────────────────────
function highlightJson(obj) {
  const jsonStr = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
  const escaped = jsonStr
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = 'json-number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'json-key';
      } else {
        cls = 'json-string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'json-boolean';
    } else if (/null/.test(match)) {
      cls = 'json-null';
    }
    return `<span class="${cls}">${match}</span>`;
  });
}

function openFullPreview() {
  if (!questions || !questions.length) {
    alert('Please enter questions JSON first.');
    return;
  }

  // Switch View
  if (viewWizard) viewWizard.style.display = 'none';
  if (headerWizardActions) headerWizardActions.style.display = 'none';
  if (viewFullPreview) viewFullPreview.style.display = 'block';
  if (headerPreviewActions) headerPreviewActions.style.display = 'flex';

  // Format JSON code and generate line numbers
  const jsonObj = currentRawParsedObj || {
    subject: metaInfo.subject,
    exam_label: metaInfo.exam_label,
    questions: questions.map(q => {
      const item = { id: q.id };
      if (q.type) item.type = q.type;
      if (q.year) item.year = q.year;
      item.question = q.question;
      if (q.is_mcq !== undefined) item.is_mcq = q.is_mcq;
      if (q.options) item.options = q.options;
      if (q.answer !== undefined) item.answer = q.answer;
      return item;
    })
  };

  const formattedStr = JSON.stringify(jsonObj, null, 2);
  const lineCount = formattedStr.split('\n').length;
  let linesHtml = '';
  for (let i = 1; i <= lineCount; i++) {
    linesHtml += `${i}<br>`;
  }

  if (fullEditorLines) fullEditorLines.innerHTML = linesHtml;
  if (fullEditorCode) fullEditorCode.innerHTML = highlightJson(jsonObj);

  // Render slide in preview
  renderCarouselDots();
  renderSlide(currentSlideIdx);
}

function closeFullPreview() {
  if (viewFullPreview) viewFullPreview.style.display = 'none';
  if (headerPreviewActions) headerPreviewActions.style.display = 'none';
  if (viewWizard) viewWizard.style.display = 'block';
  if (headerWizardActions) headerWizardActions.style.display = 'flex';
  renderSlide(currentSlideIdx);
}

btnPreviewFull?.addEventListener('click', openFullPreview);
btnCloseFullPreview?.addEventListener('click', closeFullPreview);

// ── Theme Toggle (Light / Dark) ─────────────────────────────────────────────
async function initTheme() {
  let theme = 'light';
  try {
    const cfg = await window.electronAPI.getConfig();
    if (cfg && cfg.theme) {
      theme = cfg.theme;
    } else {
      const local = localStorage.getItem('ppt_maker_theme');
      if (local) theme = local;
    }
  } catch (_) {
    const local = localStorage.getItem('ppt_maker_theme');
    if (local) theme = local;
  }
  applyTheme(theme, false);
}

function applyTheme(theme, saveToConfig = true) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (themeMoonIcon) {
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
    }
    localStorage.setItem('ppt_maker_theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (themeMoonIcon) {
      themeMoonIcon.innerHTML = `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`;
    }
    localStorage.setItem('ppt_maker_theme', 'light');
  }

  if (saveToConfig && window.electronAPI?.saveConfig) {
    window.electronAPI.saveConfig({ theme }).catch(() => {});
  }
}

btnThemeToggle?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark', true);
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

// ── Desktop App Auto-Updater Controller ─────────────────────────────────────
const updateBanner        = document.getElementById('update-banner');
const updateBannerText    = document.getElementById('update-banner-text');
const btnRestartApp       = document.getElementById('btn-restart-app');
const appUpdateStatus     = document.getElementById('app-update-status');
const btnCheckAppUpdate   = document.getElementById('btn-check-app-update');

btnRestartApp?.addEventListener('click', () => {
  window.electronAPI?.restartAndInstallUpdate();
});

btnCheckAppUpdate?.addEventListener('click', async () => {
  btnCheckAppUpdate.disabled = true;
  btnCheckAppUpdate.textContent = 'Checking…';
  try {
    const res = await window.electronAPI?.checkForAppUpdates();
    if (res?.status === 'dev') {
      alert(res.message || 'Auto-updates are only active in packaged app builds.');
    } else if (res?.status === 'error') {
      alert('Update check error: ' + (res.message || 'Unknown error'));
    }
  } catch (err) {
    alert('Update check error: ' + err.message);
  } finally {
    btnCheckAppUpdate.disabled = false;
    btnCheckAppUpdate.textContent = 'Check for App Updates';
  }
});

if (window.electronAPI?.onUpdaterStatus) {
  window.electronAPI.onUpdaterStatus((info) => {
    if (!info) return;

    if (info.status === 'checking') {
      if (appUpdateStatus) appUpdateStatus.textContent = 'Checking GitHub Releases for updates…';
    } else if (info.status === 'available') {
      if (appUpdateStatus) appUpdateStatus.textContent = `Update v${info.version || ''} found! Downloading in background…`;
      if (updateBanner && updateBannerText) {
        updateBannerText.textContent = `Downloading PPT Maker v${info.version || ''} in background…`;
        if (btnRestartApp) btnRestartApp.style.display = 'none';
        updateBanner.style.display = 'flex';
      }
    } else if (info.status === 'downloading') {
      if (appUpdateStatus) appUpdateStatus.textContent = `Downloading update: ${info.percent || 0}%`;
      if (updateBannerText) updateBannerText.textContent = `Downloading PPT Maker update: ${info.percent || 0}%`;
    } else if (info.status === 'downloaded') {
      if (appUpdateStatus) appUpdateStatus.textContent = `Update v${info.version || ''} downloaded! Ready to install.`;
      if (updateBanner && updateBannerText) {
        updateBannerText.textContent = `🎉 PPT Maker v${info.version || ''} is ready! Restart to apply.`;
        if (btnRestartApp) btnRestartApp.style.display = 'inline-block';
        updateBanner.style.display = 'flex';
      }
    } else if (info.status === 'not-available') {
      if (appUpdateStatus) appUpdateStatus.textContent = 'PPT Maker is up to date (latest release).';
    } else if (info.status === 'error') {
      if (appUpdateStatus) appUpdateStatus.textContent = info.message || 'Update check failed.';
    }
  });
}

// ── Startup ──────────────────────────────────────────────────────────────────
initTheme();
initConfig();
openStep(1);
