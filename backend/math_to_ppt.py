#!/usr/bin/env python3
"""
Physics/Math Questions → PowerPoint Generator
Outputs 100% editable native PowerPoint slides with formatted math,
Assamese/English text, and MCQ option cards.
Usage: python math_to_ppt.py <json_input_path> <pptx_output_path>
"""
import sys, json, io, re, os

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import rcParams

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml import parse_xml

# ── Geometry ───────────────────────────────────────────────────────────────────
SW, SH   = Inches(13.333), Inches(7.5)
ML = MR  = Inches(0.6)
CW       = SW - ML - MR

# ── Dark Theme Colors ──────────────────────────────────────────────────────────
BG        = RGBColor(0x0F, 0x0F, 0x13)
HEADER_C  = RGBColor(0x1A, 0x1A, 0x2E)
ACCENT    = RGBColor(0x63, 0xCA, 0xB7)
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
LGRAY     = RGBColor(0xD8, 0xDC, 0xF0)
MUTED     = RGBColor(0x9E, 0xA4, 0xBC)
BG_HEX    = '#0f0f13'

OPT_BG = [
    RGBColor(0x18, 0x2A, 0x44),   # A blue
    RGBColor(0x13, 0x36, 0x24),   # B green
    RGBColor(0x3B, 0x25, 0x0E),   # C orange
    RGBColor(0x2E, 0x16, 0x3C),   # D purple
]
BADGE_BG = [
    RGBColor(0x28, 0x48, 0x74),
    RGBColor(0x20, 0x58, 0x38),
    RGBColor(0x5A, 0x38, 0x16),
    RGBColor(0x4C, 0x24, 0x62),
]
LABELS = ['A', 'B', 'C', 'D']

GREEK = {
    r'\alpha': 'α', r'\beta': 'β', r'\gamma': 'γ', r'\delta': 'δ', r'\epsilon': 'ε',
    r'\varepsilon': 'ε', r'\zeta': 'ζ', r'\eta': 'η', r'\theta': 'θ', r'\vartheta': 'θ',
    r'\iota': 'ι', r'\kappa': 'κ', r'\lambda': 'λ', r'\mu': 'μ', r'\nu': 'ν',
    r'\xi': 'ξ', r'\pi': 'π', r'\rho': 'ρ', r'\sigma': 'σ', r'\tau': 'τ',
    r'\upsilon': 'υ', r'\phi': 'φ', r'\varphi': 'φ', r'\chi': 'χ', r'\psi': 'ψ',
    r'\omega': 'ω', r'\Gamma': 'Γ', r'\Delta': 'Δ', r'\Theta': 'Θ', r'\Lambda': 'Λ',
    r'\Xi': 'Ξ', r'\Pi': 'Π', r'\Sigma': 'Σ', r'\Upsilon': 'Υ', r'\Phi': 'Φ',
    r'\Psi': 'Ψ', r'\Omega': 'Ω'
}

SUPERSCRIPTS = str.maketrans('0123456789+-=()ni', '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ')
SUBSCRIPTS   = str.maketrans('0123456789+-=()aehijklmnoprstuvx', '₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ')

def latex_to_unicode(latex):
    """Converts inline LaTeX expressions into clean, readable Unicode math."""
    s = latex.strip()
    s = re.sub(r'\\(?:text|mathrm|mathbf|mathit)\{([^}]+)\}', r' \1 ', s)
    s = s.replace(r'\frac{1}{2}', '½').replace(r'\frac{1}{4}', '¼').replace(r'\frac{3}{4}', '¾')
    s = s.replace(r'\frac{1}{3}', '⅓').replace(r'\frac{2}{3}', '⅔')
    s = s.replace(r'\times', '×').replace(r'\cdot', '·').replace(r'\pm', '±').replace(r'\mp', '∓')
    s = s.replace(r'\leq', '≤').replace(r'\geq', '≥').replace(r'\approx', '≈').replace(r'\neq', '≠')
    s = s.replace(r'\rightarrow', '→').replace(r'\leftarrow', '←').replace(r'\infty', '∞')
    s = s.replace(r'\degree', '°').replace(r'^\circ', '°')
    for k, v in GREEK.items():
        s = re.sub(re.escape(k) + r'(?![a-zA-Z])', v, s)
    # Math functions (sin, cos, tan, log, etc.)
    for fn in ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'ln', 'log', 'exp', 'lim']:
        s = re.sub(r'\\' + fn + r'(?![a-zA-Z])', fn + ' ', s)
    s = s.replace(r'\div', '÷').replace(r'\sqrt', '√')
    s = s.replace(r'\partial', '∂').replace(r'\nabla', '∇')
    s = re.sub(r'\^\{([^}]+)\}', lambda m: m.group(1).translate(SUPERSCRIPTS), s)
    s = re.sub(r'\^([0-9\+\-\(\)ni])', lambda m: m.group(1).translate(SUPERSCRIPTS), s)
    s = re.sub(r'_\{([^}]+)\}', lambda m: m.group(1).translate(SUBSCRIPTS), s)
    s = re.sub(r'_([0-9\+\-\(\)aehijklmnoprstuvx])', lambda m: m.group(1).translate(SUBSCRIPTS), s)
    s = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1/\2)', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def is_assamese(s):
    return any(('\u0900' <= c <= '\u09FF') for c in s)

def strip_citations(text):
    """Strips AI grounding citations like [cite: 1], [cite: 1, 2], [cite: 1, [citation: 1], etc."""
    if not text:
        return ''
    s = re.sub(r'\[(?:cite|citation|source|ref):\s*[^\]\n]*\]?', '', str(text), flags=re.IGNORECASE)
    s = re.sub(r'\[cite:\s*\d+', '', s, flags=re.IGNORECASE)
    s = re.sub(r'[ \t]{2,}', ' ', s)
    s = re.sub(r' \n', '\n', s)
    s = re.sub(r'\n ', '\n', s)
    return s.strip()

def calc_option_width(label, opt_text):
    """Calculates compact width for an MCQ option box so it never takes the whole slide."""
    clean = latex_to_unicode(opt_text.replace('$', ''))
    full_str = f"({label}) {clean}"
    char_len = len(full_str)
    # Average Pt(20) character is ~0.155 in wide + 0.35 in padding
    est_w = Inches(char_len * 0.155 + 0.35)
    return min(max(Inches(1.2), est_w), CW)

def render_display_eq(latex, fontsize=26, dpi=200):
    """Render a display LaTeX equation with matplotlib on dark background."""
    try:
        expr = '$' + latex.strip().strip('$') + '$'
        fig, ax = plt.subplots(figsize=(6, 1.1), dpi=dpi)
        fig.patch.set_facecolor(BG_HEX)
        ax.set_facecolor(BG_HEX)
        ax.set_axis_off()
        t = ax.text(0.5, 0.5, expr, fontsize=fontsize, color='#63cab7',
                    ha='center', va='center', transform=ax.transAxes)
        fig.canvas.draw()
        bb = t.get_window_extent(fig.canvas.get_renderer())
        pad = 24
        w_in = max(2.2, (bb.width + pad * 2) / dpi)
        h_in = max(0.65, (bb.height + pad * 2) / dpi)
        fig.set_size_inches(w_in, h_in)
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=dpi, facecolor=BG_HEX,
                    bbox_inches='tight', pad_inches=0.08)
        plt.close(fig)
        buf.seek(0)
        return buf, w_in, h_in
    except Exception:
        plt.close('all')
        return None, 0, 0

def set_run_font(r, font_name, size=None, bold=False, italic=False, color=None):
    """
    Sets font properties and explicitly injects <a:cs> (Complex Script) and <a:ea> (East Asian)
    font elements into DrawingML.
    Without <a:cs>, Microsoft PowerPoint defaults to fallback Indic fonts (Nirmala UI / Vrinda)
    for Assamese/Bengali characters instead of applying Banikanta!
    """
    r.font.name = font_name
    if size is not None:
        r.font.size = size
    if bold:
        r.font.bold = True
    if italic:
        r.font.italic = True
    if color is not None:
        r.font.color.rgb = color

    rPr = r._r.get_or_add_rPr()
    cs = parse_xml(f'<a:cs xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" typeface="{font_name}"/>')
    ea = parse_xml(f'<a:ea xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" typeface="{font_name}"/>')
    rPr.append(cs)
    rPr.append(ea)

def add_paragraph_runs(p, text, font_size=None):
    """Appends styled runs to paragraph p, handling Assamese, English, and inline $math$."""
    tokens = re.split(r'(\$[^$]+\$)', text)
    for tok in tokens:
        if not tok: continue
        r = p.add_run()
        if tok.startswith('$') and tok.endswith('$'):
            # Inline math
            math_expr = tok[1:-1].strip()
            clean_math = latex_to_unicode(math_expr)
            r.text = clean_math
            set_run_font(r, 'Cambria Math', size=font_size or Pt(21), italic=True, color=ACCENT)
        else:
            # Normal text (Assamese and English)
            has_as = is_assamese(tok)
            r.text = tok
            sz = font_size or Pt(22 if has_as else 21)
            col = WHITE if has_as else LGRAY
            set_run_font(r, 'Banikanta', size=sz, color=col)

def generate(data, output_path):
    prs = Presentation()
    prs.slide_width  = SW
    prs.slide_height = SH

    if isinstance(data, list):
        questions = data
        subject = 'Physics'
        exam_lbl = ''
    elif isinstance(data, dict):
        questions = data.get('questions', [])
        subject   = data.get('subject', 'Physics')
        exam_lbl  = data.get('exam_label', '')
    else:
        questions = []

    for idx, q in enumerate(questions):
        slide = prs.slides.add_slide(prs.slide_layouts[6]) # blank layout
        
        # 1. Dark Background
        bg = slide.background.fill
        bg.solid()
        bg.fore_color.rgb = BG

        # 2. Process Question Text and Display Equations
        raw_text = strip_citations(q.get('question', ''))
        raw_options = q.get('options', [])
        options  = [strip_citations(o) for o in raw_options]
        is_mcq   = q.get('is_mcq', len(options) > 0)

        # Separate $$display$$ equations from text
        blocks = []
        last = 0
        for m in re.finditer(r'\$\$(.+?)\$\$', raw_text, re.DOTALL):
            if m.start() > last:
                t = raw_text[last:m.start()].strip()
                if t: blocks.append(('text', t))
            blocks.append(('display', m.group(1).strip()))
            last = m.end()
        if last < len(raw_text):
            t = raw_text[last:].strip()
            if t: blocks.append(('text', t))

        # Position calculations: Start question right at top-left corner
        content_top = Inches(0.4)
        
        # Estimate height taken by question text accurately
        total_text_lines = 0
        num_non_empty_paras = 0
        for btype, bcontent in blocks:
            if btype == 'text':
                for line in bcontent.split('\n'):
                    line_s = line.strip()
                    if line_s:
                        num_non_empty_paras += 1
                        u_len = len(latex_to_unicode(re.sub(r'\$[^$]+\$', 'MMMM', line_s)))
                        wrap_lines = max(1, (u_len + 88) // 92)
                        total_text_lines += wrap_lines

        para_gaps = max(0, num_non_empty_paras - 1)
        q_text_h = max(Inches(0.4), total_text_lines * Inches(0.36) + para_gaps * Inches(0.11) + Inches(0.04))

        # Add Native Text Box for the question text
        tb = slide.shapes.add_textbox(ML, content_top, CW, q_text_h)
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

        first_p = True
        display_eqs = []

        for btype, bcontent in blocks:
            if btype == 'text':
                # Split into paragraphs
                for line in bcontent.split('\n'):
                    line_s = line.strip()
                    if not line_s:
                        continue
                    p = tf.paragraphs[0] if first_p else tf.add_paragraph()
                    first_p = False
                    p.space_after = Pt(8)
                    add_paragraph_runs(p, line_s)
            elif btype == 'display':
                display_eqs.append(bcontent)

        cur_y = content_top + q_text_h

        # 4. Render and place any Display Equations directly below question text
        if display_eqs:
            cur_y += Inches(0.08)
            for deq in display_eqs:
                buf, dw, dh = render_display_eq(deq, fontsize=26)
                if buf:
                    dw_in = min(Inches(dw), Inches(7.0))
                    dh_in = Inches(dh)
                    dx = ML + Inches(0.25)
                    slide.shapes.add_picture(buf, dx, cur_y, dw_in, dh_in)
                    cur_y += dh_in + Inches(0.10)

        # 5. MCQ Options (Simple Text, Each Option on a New Line, Compact Sized Box)
        if is_mcq and options:
            start_opt_y = cur_y + Inches(0.18)
            opt_h = Inches(0.40)
            gap_y = Inches(0.16)

            for i in range(min(4, len(options))):
                opt_str = str(options[i]).strip()
                if not opt_str:
                    continue
                oy = start_opt_y + i * (opt_h + gap_y)

                # Calculate compact width so textbox does NOT stretch across the slide
                opt_w = calc_option_width(LABELS[i], opt_str)

                tb_opt = slide.shapes.add_textbox(ML, oy, opt_w, opt_h)
                tf_o = tb_opt.text_frame
                tf_o.auto_size = MSO_AUTO_SIZE.SHAPE_TO_FIT_TEXT
                tf_o.word_wrap = True if opt_w >= CW else False
                tf_o.margin_left = Inches(0.04)
                tf_o.margin_right = Inches(0.04)
                tf_o.margin_top = Inches(0.02)
                tf_o.margin_bottom = Inches(0.02)
                p_o = tf_o.paragraphs[0]

                # Label (A), (B), (C), (D)
                r_lbl = p_o.add_run()
                r_lbl.text = f'({LABELS[i]}) '
                set_run_font(r_lbl, 'Banikanta', size=Pt(20), bold=True, color=ACCENT)

                # Option content (handle LaTeX or normal text)
                if '$' in opt_str:
                    add_paragraph_runs(p_o, opt_str, font_size=Pt(20))
                else:
                    c_r = p_o.add_run()
                    c_r.text = opt_str
                    set_run_font(c_r, 'Banikanta', size=Pt(20), color=WHITE)

        # 6. Slide number footer
        tb_f = slide.shapes.add_textbox(0, SH - Inches(0.4), SW, Inches(0.35))
        p_f = tb_f.text_frame.paragraphs[0]
        p_f.alignment = PP_ALIGN.CENTER
        r_f = p_f.add_run()
        r_f.text = str(idx + 1)
        set_run_font(r_f, 'Banikanta', size=Pt(11), color=MUTED)

    prs.save(output_path)
    return {'success': True, 'output': output_path}


if __name__ == '__main__':
    try:
        json_path, out_path = sys.argv[1], sys.argv[2]
        with open(json_path, 'r', encoding='utf-8-sig') as f:
            data = json.load(f)
        result = generate(data, out_path)
        print(json.dumps(result))
    except Exception as exc:
        import traceback
        print(json.dumps({'success': False,
                          'error': str(exc),
                          'tb': traceback.format_exc()}))
        sys.exit(1)
