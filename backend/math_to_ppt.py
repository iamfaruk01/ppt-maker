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

def normalize_fractions(text):
    """
    Normalizes (m/a) or m/a into proper LaTeX \\frac{m}{a}.
    """
    if not text:
        return ""
    # Parenthesized fractions: (m/a) -> \frac{m}{a}
    t = re.sub(r'\(([a-zA-Z0-9_\+\-\*\^]+)\s*/\s*([a-zA-Z0-9_\+\-\*\^]+)\)', r'\\frac{\1}{\2}', text)
    # Simple fraction: preceded by space, =, (, [, +, -
    t = re.sub(r'(?<=[=\s\+\-\(\[])([a-zA-Z0-9_]+)\s*/\s*([a-zA-Z0-9_]+)(?=[\s\+\-\)\]\.,]|$)', r'\\frac{\1}{\2}', t)
    # Standalone fraction: "m/a"
    t = re.sub(r'^([a-zA-Z0-9_]+)\s*/\s*([a-zA-Z0-9_]+)$', r'\\frac{\1}{\2}', t)
    return t

def wrap_bare_latex(text):
    """
    Wraps bare LaTeX commands (\\frac, \\sqrt, \\sum, \\int, etc.) that appear
    OUTSIDE of $...$ or $$...$$ math delimiters into $...$, so they get
    rendered as native OMML equations instead of literal strings.

    Example: "v = 5 \\frac{m}{s}" -> "v = 5 $\\frac{m}{s}$"
    """
    if not text or ('\\' not in text):
        return text

    BARE_LATEX_PAT = re.compile(
        r'(?<!\$)'          # not already preceded by $
        r'(\\'
        r'(?:frac\{[^}]+\}\{[^}]+\}'   # \frac{A}{B}
        r'|binom\{[^}]+\}\{[^}]+\}'   # \binom{n}{r}
        r'|sqrt(?:\[[^\]]*\])?\{[^}]+\}'   # \sqrt{x} or \sqrt[n]{x}
        r'|begin\{[a-zA-Z*]+\}[\s\S]*?end\{[a-zA-Z*]+\}'  # environments
        r'|sum(?:_\{[^}]+\})?(?:\^\{[^}]+\})?'  # \sum or \sum_{a}^{b}
        r'|int(?:_\{[^}]+\})?(?:\^\{[^}]+\})?'  # \int or \int_{a}^{b}
        r'|prod(?:_\{[^}]+\})?(?:\^\{[^}]+\})?'  # \prod
        r'|(?:vec|hat|bar|overline|underline|overrightarrow|dot|ddot|tilde|breve|acute|grave|check|mathbf|mathrm|mathit|text)\{[^}]+\}'  # accents/styles
        r'|(?:sin|cos|tan|cot|sec|csc|log|ln|lg|lim|exp|arcsin|arccos|arctan)(?:\^\{[^}]+\}|\^[0-9a-zA-Z\+\-]+|_\{[^}]+\}|_[0-9a-zA-Z]+)*(?:\([^\)]+\))?(?:\s+[a-zA-Z0-9]+)?'  # functions with sup/sub/arg
        r'|[a-zA-Z]+(?:\^\{[^}]+\}|\^[0-9a-zA-Z\+\-]+|_\{[^}]+\}|_[0-9a-zA-Z]+)+'  # any cmd with sub/sup e.g. \theta_1, \pi^2
        r'|(?:alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|infty|propto|partial|nabla|degree|pm|mp|times|cdot|approx|neq|leq|geq|to|rightarrow|leftarrow)'  # greek/symbols
        r'))'
        r'(?!\$)'           # not followed by $
    )

    # Split on existing $ delimiters, only process text outside math mode
    parts = re.split(r'(\$\$.*?\$\$|\$.*?\$)', text, flags=re.DOTALL)
    result = []
    for part in parts:
        if part.startswith('$'):
            result.append(part)  # already math, keep as-is
        else:
            result.append(BARE_LATEX_PAT.sub(r'$\1$', part))
    return ''.join(result)

def parse_math_tokens(s, color_hex="63CAB7", sz=2000):
    """
    Converts LaTeX math expression into a list of DrawingML OMML XML elements.
    Supports fractions with true horizontal division bars, superscripts,
    subscripts, radicals, Greek letters, operators, and functions.
    """
    res = []
    i = 0
    n = len(s)

    def make_r(text):
        safe = str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        return f'<m:r><a:rPr sz="{sz}"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:t>{safe}</m:t></m:r>'

    def extract_braced_arg(start_idx):
        if start_idx >= n:
            return "", start_idx
        if s[start_idx] == '{':
            depth = 1
            j = start_idx + 1
            while j < n and depth > 0:
                if s[j] == '{': depth += 1
                elif s[j] == '}': depth -= 1
                j += 1
            if depth == 0:
                return s[start_idx+1:j-1], j
            else:
                return s[start_idx+1:], n
        else:
            m = re.match(r'^[+\-]?[a-zA-Z0-9]+', s[start_idx:])
            if m:
                end = start_idx + len(m.group(0))
                return m.group(0), end
            return s[start_idx:start_idx+1], start_idx + 1

    while i < n:
        c = s[i]
        if c.isspace():
            # Emit a thin space run so function names stay separated from their arguments
            # e.g. \log x renders as "log x" not "logx"
            res.append(f'<m:r><a:rPr sz="{sz}"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:t xml:space="preserve"> </m:t></m:r>')
            i += 1
            continue

        # Subscripts and superscripts when ^ or _ appears after any atom (function, Greek, symbol, etc.)
        if c in ['^', '_']:
            has_sub = (c == '_')
            has_sup = (c == '^')
            sub_content = ""
            sup_content = ""
            i += 1
            while i < n and s[i].isspace(): i += 1
            arg, i = extract_braced_arg(i)
            if has_sup:
                sup_content = arg
            else:
                sub_content = arg

            # Check if the other operator follows immediately (e.g. ^2_3 or _3^2)
            saved_i = i
            while i < n and s[i].isspace(): i += 1
            if i < n and s[i] in ['^', '_']:
                op2 = s[i]
                i += 1
                while i < n and s[i].isspace(): i += 1
                arg2, i = extract_braced_arg(i)
                if op2 == '^':
                    has_sup = True
                    sup_content = arg2
                else:
                    has_sub = True
                    sub_content = arg2
            else:
                i = saved_i

            # Pop any trailing space runs before getting the base
            trailing_spaces = []
            while res and 'xml:space="preserve"' in res[-1]:
                trailing_spaces.append(res.pop())
            base_omml = res.pop() if res else make_r("")

            if has_sub and has_sup:
                sub_omml = "".join(parse_math_tokens(sub_content, color_hex, sz))
                sup_omml = "".join(parse_math_tokens(sup_content, color_hex, sz))
                res.append(f'<m:sSubSup><m:e>{base_omml}</m:e><m:sub>{sub_omml}</m:sub><m:sup>{sup_omml}</m:sup></m:sSubSup>')
            elif has_sup:
                sup_omml = "".join(parse_math_tokens(sup_content, color_hex, sz))
                res.append(f'<m:sSup><m:e>{base_omml}</m:e><m:sup>{sup_omml}</m:sup></m:sSup>')
            elif has_sub:
                sub_omml = "".join(parse_math_tokens(sub_content, color_hex, sz))
                res.append(f'<m:sSub><m:e>{base_omml}</m:e><m:sub>{sub_omml}</m:sub></m:sSub>')

            # If the base was a math function (like sin, cos, tan, log), add a thin space before arguments like \theta or x
            if '<m:nor/>' in base_omml:
                if i < n and s[i] not in ['^', '_', ' ', '(', '[', ',', ')', ']', '+', '-', '=', '*', '/']:
                    res.append(f'<m:r><a:rPr sz="{sz}"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:t xml:space="preserve"> </m:t></m:r>')
            continue

        # Top-level braced group: {x+y}
        if c == '{':
            arg_str, i = extract_braced_arg(i)
            arg_omml = "".join(parse_math_tokens(arg_str, color_hex, sz))
            res.append(arg_omml)
            continue

        # \\frac{num}{den}
        if s.startswith(r'\frac', i):
            i += 5
            while i < n and s[i].isspace(): i += 1
            num_str, i = extract_braced_arg(i)
            while i < n and s[i].isspace(): i += 1
            den_str, i = extract_braced_arg(i)
            if den_str.strip():
                # Normal fraction: numerator / denominator
                num_omml = "".join(parse_math_tokens(num_str, color_hex, sz))
                den_omml = "".join(parse_math_tokens(den_str, color_hex, sz))
                res.append(f'<m:f><m:num>{num_omml}</m:num><m:den>{den_omml}</m:den></m:f>')
            else:
                # Malformed \frac with missing denominator — render numerator in parens
                num_omml = "".join(parse_math_tokens(num_str, color_hex, sz))
                res.append(make_r('('))
                res.extend(parse_math_tokens(num_str, color_hex, sz))
                res.append(make_r(')'))
            continue

        # \\binom{n}{r}
        if s.startswith(r'\binom', i):
            i += 6
            while i < n and s[i].isspace(): i += 1
            n_str, i = extract_braced_arg(i)
            while i < n and s[i].isspace(): i += 1
            r_str, i = extract_braced_arg(i)
            n_omml = "".join(parse_math_tokens(n_str, color_hex, sz))
            r_omml = "".join(parse_math_tokens(r_str, color_hex, sz))
            res.append(f'<m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/><m:grow/></m:dPr><m:e><m:f><m:fPr><m:type m:val="noBar"/></m:fPr><m:num>{n_omml}</m:num><m:den>{r_omml}</m:den></m:f></m:e></m:d>')
            continue

        # Environments: matrix, bmatrix, pmatrix, vmatrix, cases, aligned
        if s.startswith(r'\begin{', i):
            m_env = re.match(r'\\begin\{([a-zA-Z*]+)\}', s[i:])
            if m_env:
                env_name = m_env.group(1)
                end_tag = f'\\end{{{env_name}}}'
                end_pos = s.find(end_tag, i)
                if end_pos != -1:
                    env_body = s[i + len(m_env.group(0)):end_pos]
                    i = end_pos + len(end_tag)

                    if env_name in ['matrix', 'bmatrix', 'pmatrix', 'vmatrix', 'Vmatrix']:
                        delims = {
                            'matrix': ('', ''),
                            'bmatrix': ('[', ']'),
                            'pmatrix': ('(', ')'),
                            'vmatrix': ('|', '|'),
                            'Vmatrix': ('‖', '‖'),
                        }
                        beg_c, end_c = delims.get(env_name, ('[', ']'))
                        rows = re.split(r'\\\\|\\cr', env_body)
                        mr_list = []
                        for r_text in rows:
                            if not r_text.strip(): continue
                            cells = r_text.split('&')
                            e_list = []
                            for c_text in cells:
                                c_omml = "".join(parse_math_tokens(c_text.strip(), color_hex, sz))
                                e_list.append(f'<m:e>{c_omml}</m:e>')
                            mr_list.append(f'<m:mr>{"".join(e_list)}</m:mr>')
                        m_xml = f'<m:m>{"".join(mr_list)}</m:m>'
                        if beg_c or end_c:
                            res.append(f'<m:d><m:dPr><m:begChr m:val="{beg_c}"/><m:endChr m:val="{end_c}"/><m:grow/></m:dPr><m:e>{m_xml}</m:e></m:d>')
                        else:
                            res.append(m_xml)
                        continue
                    elif env_name == 'cases':
                        rows = re.split(r'\\\\|\\cr', env_body)
                        e_list = []
                        for r_text in rows:
                            if not r_text.strip(): continue
                            c_text = r_text.replace('&', ' ')
                            c_omml = "".join(parse_math_tokens(c_text.strip(), color_hex, sz))
                            e_list.append(f'<m:e>{c_omml}</m:e>')
                        res.append(f'<m:d><m:dPr><m:begChr m:val="{{"/><m:endChr m:val=""/><m:grow/></m:dPr><m:e><m:eqArr>{"".join(e_list)}</m:eqArr></m:e></m:d>')
                        continue
                    elif env_name in ['aligned', 'align', 'align*', 'gather', 'gathered', 'split']:
                        rows = re.split(r'\\\\|\\cr', env_body)
                        e_list = []
                        for r_text in rows:
                            if not r_text.strip(): continue
                            c_text = r_text.replace('&', '')
                            c_omml = "".join(parse_math_tokens(c_text.strip(), color_hex, sz))
                            e_list.append(f'<m:e>{c_omml}</m:e>')
                        res.append(f'<m:eqArr>{"".join(e_list)}</m:eqArr>')
                        continue

        # \\sqrt[n]{x} or \\sqrt{x}
        if s.startswith(r'\sqrt', i):
            i += 5
            while i < n and s[i].isspace(): i += 1
            deg_str = ""
            if i < n and s[i] == '[':
                j = s.find(']', i)
                if j != -1:
                    deg_str = s[i+1:j]
                    i = j + 1
            while i < n and s[i].isspace(): i += 1
            rad_str, i = extract_braced_arg(i)
            if rad_str.strip():
                rad_omml = "".join(parse_math_tokens(rad_str, color_hex, sz))
                if deg_str:
                    deg_omml = "".join(parse_math_tokens(deg_str, color_hex, sz))
                    res.append(f'<m:rad><m:deg>{deg_omml}</m:deg><m:e>{rad_omml}</m:e></m:rad>')
                else:
                    res.append(f'<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:e>{rad_omml}</m:e></m:rad>')
            else:
                # Empty radicand (\sqrt{}) — render just the √ character to avoid invalid OMML
                res.append(make_r('√'))
            continue

        # Accent commands: \vec, \hat, \bar, \dot, \ddot, \tilde, \overrightarrow
        # OMML: <m:acc><m:accPr><m:chr m:val="char"/></m:accPr><m:e>...</m:e></m:acc>
        ACCENT_CMDS = {
            'vec': '\u20d7',             # combining right arrow above ⃗
            'overrightarrow': '\u20d7',
            'hat': '\u0302',             # combining circumflex ̂
            'bar': '\u0305',             # combining overline ̄
            'overline': '\u0305',
            'dot': '\u0307',             # combining dot above ̇
            'ddot': '\u0308',            # combining diaeresis ̈
            'tilde': '\u0303',           # combining tilde ̃
            'breve': '\u0306',           # combining breve ̆
            'grave': '\u0300',
            'acute': '\u0301',
            'check': '\u030c',
        }
        accent_matched = False
        for acc_cmd, acc_char in ACCENT_CMDS.items():
            if s.startswith('\\' + acc_cmd, i):
                i += 1 + len(acc_cmd)
                while i < n and s[i].isspace(): i += 1
                arg_str, i = extract_braced_arg(i)
                arg_omml = "".join(parse_math_tokens(arg_str, color_hex, sz))
                safe_char = acc_char.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                res.append(f'<m:acc><m:accPr><m:chr m:val="{safe_char}"/></m:accPr><m:e>{arg_omml}</m:e></m:acc>')
                accent_matched = True
                break
        if accent_matched:
            continue

        # Commands: Greek, symbols, functions
        if c == '\\':
            m = re.match(r'\\([a-zA-Z]+)', s[i:])
            if m:
                cmd = m.group(1)
                i += len(m.group(0))
                # Check Greek
                greek_cmd = '\\' + cmd
                if greek_cmd in GREEK:
                    res.append(make_r(GREEK[greek_cmd]))
                elif cmd in ['times', 'cdot', 'pm', 'mp', 'leq', 'geq', 'approx', 'neq',
                             'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow',
                             'to', 'gets',
                             'leftrightarrow', 'Leftrightarrow',
                             'infty', 'div', 'partial', 'nabla', 'degree',
                             'propto', 'sim', 'simeq', 'equiv', 'cong',
                             'subset', 'supset', 'subseteq', 'supseteq',
                             'in', 'notin', 'cup', 'cap', 'emptyset',
                             'forall', 'exists', 'therefore', 'because',
                             'perp', 'parallel', 'angle', 'triangle',
                             'oplus', 'otimes', 'circ', 'bullet',
                             'll', 'gg', 'lll', 'ggg', 'ne',
                             'geqq', 'leqq', 'dagger', 'ddagger',
                             'star', 'ast', 'checkmark',
                             'percent', 'circ', 'hbar', 'ell',
                             'lvert', 'rvert', 'lVert', 'rVert',
                             'lceil', 'rceil', 'lfloor', 'rfloor',
                             'langle', 'rangle', 'lbrace', 'rbrace',
                             'ldots', 'cdots', 'vdots', 'ddots']:
                    sym_dict = {
                        'times': '×', 'cdot': '·', 'pm': '±', 'mp': '∓',
                        'leq': '≤', 'geq': '≥', 'approx': '≈', 'neq': '≠', 'ne': '≠',
                        'rightarrow': '→', 'leftarrow': '←', 'infty': '∞',
                        'to': '→', 'gets': '←',
                        'Rightarrow': '⇒', 'Leftarrow': '⇐',
                        'leftrightarrow': '↔', 'Leftrightarrow': '⇔',
                        'div': '÷', 'partial': '∂', 'nabla': '∇', 'degree': '°',
                        'propto': '∝', 'sim': '∼', 'simeq': '≃', 'equiv': '≡', 'cong': '≅',
                        'subset': '⊂', 'supset': '⊃', 'subseteq': '⊆', 'supseteq': '⊇',
                        'in': '∈', 'notin': '∉', 'cup': '∪', 'cap': '∩', 'emptyset': '∅',
                        'forall': '∀', 'exists': '∃', 'therefore': '∴', 'because': '∵',
                        'perp': '⊥', 'parallel': '∥', 'angle': '∠', 'triangle': '△',
                        'oplus': '⊕', 'otimes': '⊗', 'circ': '∘', 'bullet': '•',
                        'll': '≪', 'gg': '≫', 'lll': '⋘', 'ggg': '⋙',
                        'geqq': '≧', 'leqq': '≦', 'dagger': '†', 'ddagger': '‡',
                        'star': '⋆', 'ast': '∗', 'checkmark': '✓',
                        'percent': '%', 'circ': '∘', 'hbar': 'ħ', 'ell': 'ℓ',
                        # Delimiters
                        'lvert': '|', 'rvert': '|', 'lVert': '‖', 'rVert': '‖',
                        'lceil': '⌈', 'rceil': '⌉', 'lfloor': '⌊', 'rfloor': '⌋',
                        'langle': '⟨', 'rangle': '⟩', 'lbrace': '{', 'rbrace': '}',
                        'ldots': '…', 'cdots': '⋯', 'vdots': '⋮', 'ddots': '⋱',
                    }
                    res.append(make_r(sym_dict.get(cmd, cmd)))
                elif cmd in ['sum', 'prod', 'coprod', 'int', 'iint', 'iiint', 'oint']:
                    op_map = {
                        'sum': ('∑', 'undOvr'),
                        'prod': ('∏', 'undOvr'),
                        'coprod': ('∐', 'undOvr'),
                        'int': ('∫', 'subSup'),
                        'iint': ('∬', 'subSup'),
                        'iiint': ('∭', 'subSup'),
                        'oint': ('∮', 'subSup'),
                    }
                    op_char, lim_loc = op_map.get(cmd, ('∑', 'undOvr'))
                    has_sub = False
                    has_sup = False
                    sub_str = ""
                    sup_str = ""
                    while i < n and (s[i] in ['^', '_'] or s[i].isspace()):
                        if s[i].isspace():
                            i += 1
                            continue
                        op = s[i]
                        i += 1
                        while i < n and s[i].isspace(): i += 1
                        arg_val, i = extract_braced_arg(i)
                        if op == '^':
                            has_sup = True
                            sup_str = arg_val
                        else:
                            has_sub = True
                            sub_str = arg_val
                    sub_xml = f'<m:sub>{"".join(parse_math_tokens(sub_str, color_hex, sz))}</m:sub>' if has_sub else '<m:sub/>'
                    sup_xml = f'<m:sup>{"".join(parse_math_tokens(sup_str, color_hex, sz))}</m:sup>' if has_sup else '<m:sup/>'
                    res.append(f'<m:nary><m:naryPr><m:chr m:val="{op_char}"/><m:limLoc m:val="{lim_loc}"/></m:naryPr>{sub_xml}{sup_xml}<m:e/></m:nary>')
                    if i < n and s[i] not in ['^', '_', ' ', '(', '[', ',', ')', ']', '+', '-', '=', '*', '/']:
                        res.append(f'<m:r><a:rPr sz="{sz}"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:t xml:space="preserve"> </m:t></m:r>')
                    continue
                elif cmd in ['sin', 'cos', 'tan', 'cot', 'sec', 'csc',
                             'arcsin', 'arccos', 'arctan', 'arccot', 'arcsec', 'arccsc',
                             'sinh', 'cosh', 'tanh', 'coth', 'sech', 'csch',
                             'ln', 'log', 'lg', 'lim', 'liminf', 'limsup', 'exp',
                             'det', 'gcd', 'deg', 'dim', 'hom', 'ker',
                             'min', 'max', 'sup', 'inf', 'arg', 'Pr']:
                    res.append(f'<m:r><a:rPr sz="{sz}"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:rPr><m:nor/></m:rPr><m:t>{cmd}</m:t></m:r>')
                    if i < n and s[i] not in ['^', '_', ' ', '(', '[', ',', ')', ']', '+', '-', '=', '*', '/']:
                        res.append(f'<m:r><a:rPr sz="{sz}"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:t xml:space="preserve"> </m:t></m:r>')
                elif cmd in ['quad', 'qquad']:
                    sp_len = 8 if cmd == 'qquad' else 4
                    res.append(f'<m:r><a:rPr sz="{sz}"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:t xml:space="preserve">{" " * sp_len}</m:t></m:r>')
                elif cmd in ['displaystyle', 'textstyle', 'scriptstyle', 'scriptscriptstyle', 'limits', 'nolimits']:
                    pass
                elif cmd in ['left', 'right']:
                    while i < n and s[i].isspace(): i += 1
                    if i < n and s[i] == '.':
                        i += 1  # skip empty delimiter
                elif cmd == 'mathbf':
                    while i < n and s[i].isspace(): i += 1
                    txt_arg, i = extract_braced_arg(i)
                    safe = str(txt_arg).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    res.append(f'<m:r><a:rPr sz="{sz}" b="1"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:t>{safe}</m:t></m:r>')
                elif cmd == 'mathit':
                    while i < n and s[i].isspace(): i += 1
                    txt_arg, i = extract_braced_arg(i)
                    safe = str(txt_arg).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    res.append(f'<m:r><a:rPr sz="{sz}" i="1"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:t>{safe}</m:t></m:r>')
                elif cmd in ['mathrm', 'text']:
                    while i < n and s[i].isspace(): i += 1
                    txt_arg, i = extract_braced_arg(i)
                    res.append(f'<m:r><a:rPr sz="{sz}"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:rPr><m:nor/></m:rPr><m:t>{txt_arg}</m:t></m:r>')
                elif cmd == 'underline':
                    while i < n and s[i].isspace(): i += 1
                    txt_arg, i = extract_braced_arg(i)
                    safe = str(txt_arg).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    res.append(f'<m:r><a:rPr sz="{sz}" u="sng"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:t>{safe}</m:t></m:r>')
                elif cmd == 'overline':
                    while i < n and s[i].isspace(): i += 1
                    txt_arg, i = extract_braced_arg(i)
                    arg_omml = "".join(parse_math_tokens(txt_arg, color_hex, sz))
                    res.append(f'<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>{arg_omml}</m:e></m:bar>')
                else:
                    # Unknown command — render as \cmd text, and consume any following {arg}
                    res.append(make_r('\\' + cmd))
                    saved_i = i
                    while i < n and s[i].isspace(): i += 1
                    if i < n and s[i] == '{':
                        arg, i = extract_braced_arg(i)
                        if arg:
                            res.append(make_r('{'))
                            res.extend(parse_math_tokens(arg, color_hex, sz))
                            res.append(make_r('}'))
                    else:
                        i = saved_i  # restore: don't eat whitespace before non-brace
                continue
            else:
                next_c = s[i]
                if next_c in [',', '>', ':']:
                    # Thin space: \, or \:
                    res.append(f'<m:r><a:rPr sz="{sz}"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:t xml:space="preserve"> </m:t></m:r>')
                    i += 1
                elif next_c == ';':
                    # Medium space: \;
                    res.append(f'<m:r><a:rPr sz="{sz}"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:t xml:space="preserve">  </m:t></m:r>')
                    i += 1
                elif next_c == '!':
                    # Negative space: \!
                    i += 1
                elif next_c in [' ', '\t']:
                    res.append(f'<m:r><a:rPr sz="{sz}"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:t xml:space="preserve"> </m:t></m:r>')
                    i += 1
                elif next_c in ['%', '_', '#', '&', '$', '{', '}']:
                    res.append(make_r(next_c))
                    i += 1
                elif next_c == '\\':
                    # \\ newline in math
                    i += 1
                else:
                    res.append(make_r(next_c))
                    i += 1
                continue

        curr_run = c
        i += 1
        while i < n and (s[i].isalnum() or s[i] in '=+-*/(),.[] '):
            if s[i] in ['^', '_', '\\']:
                break
            curr_run += s[i]
            i += 1

        has_sub = False
        has_sup = False
        sub_content = ""
        sup_content = ""

        while i < n and (s[i] in ['^', '_']):
            op = s[i]
            i += 1
            while i < n and s[i].isspace(): i += 1
            arg, i = extract_braced_arg(i)
            if op == '^':
                has_sup = True
                sup_content = arg
            else:
                has_sub = True
                sub_content = arg

        MATH_FUNCS = {'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan',
                      'sinh', 'cosh', 'tanh', 'log', 'ln', 'lg', 'lim', 'exp', 'det', 'gcd', 'max', 'min'}
        clean_run = curr_run.strip()
        is_func = clean_run.lower() in MATH_FUNCS
        is_paren_group = clean_run.startswith('(') and clean_run.endswith(')')

        if has_sub and has_sup:
            if is_func:
                base_omml = f'<m:r><a:rPr sz="{sz}"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:rPr><m:nor/></m:rPr><m:t>{clean_run}</m:t></m:r>'
            elif is_paren_group or len(clean_run) <= 1:
                base_omml = make_r(curr_run)
            else:
                base_str = curr_run[:-1]
                target_char = curr_run[-1]
                res.append(make_r(base_str))
                base_omml = make_r(target_char)
            sub_omml = "".join(parse_math_tokens(sub_content, color_hex, sz))
            sup_omml = "".join(parse_math_tokens(sup_content, color_hex, sz))
            res.append(f'<m:sSubSup><m:e>{base_omml}</m:e><m:sub>{sub_omml}</m:sub><m:sup>{sup_omml}</m:sup></m:sSubSup>')
        elif has_sup:
            if is_func:
                base_omml = f'<m:r><a:rPr sz="{sz}"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:rPr><m:nor/></m:rPr><m:t>{clean_run}</m:t></m:r>'
            elif is_paren_group or len(clean_run) <= 1:
                base_omml = make_r(curr_run)
            else:
                base_str = curr_run[:-1]
                target_char = curr_run[-1]
                res.append(make_r(base_str))
                base_omml = make_r(target_char)
            sup_omml = "".join(parse_math_tokens(sup_content, color_hex, sz))
            res.append(f'<m:sSup><m:e>{base_omml}</m:e><m:sup>{sup_omml}</m:sup></m:sSup>')
        elif has_sub:
            if is_func:
                base_omml = f'<m:r><a:rPr sz="{sz}"><a:solidFill><a:srgbClr val="{color_hex}"/></a:solidFill></a:rPr><m:rPr><m:nor/></m:rPr><m:t>{clean_run}</m:t></m:r>'
            elif is_paren_group or len(clean_run) <= 1:
                base_omml = make_r(curr_run)
            else:
                base_str = curr_run[:-1]
                target_char = curr_run[-1]
                res.append(make_r(base_str))
                base_omml = make_r(target_char)
            sub_omml = "".join(parse_math_tokens(sub_content, color_hex, sz))
            res.append(f'<m:sSub><m:e>{base_omml}</m:e><m:sub>{sub_omml}</m:sub></m:sSub>')
        else:
            res.append(make_r(curr_run))

    return res

_XSLT_TRANSFORM = None

def get_xslt_transform():
    global _XSLT_TRANSFORM
    if _XSLT_TRANSFORM is None:
        try:
            from lxml import etree
            script_dir = os.path.dirname(os.path.abspath(__file__))
            xsl_path = os.path.join(script_dir, 'MML2OMML.XSL')
            if not os.path.exists(xsl_path):
                office_paths = [
                    r'C:\Program Files\Microsoft Office\root\Office16\MML2OMML.XSL',
                    r'C:\Program Files (x86)\Microsoft Office\root\Office16\MML2OMML.XSL',
                ]
                for op in office_paths:
                    if os.path.exists(op):
                        xsl_path = op
                        break
            if os.path.exists(xsl_path):
                xslt_doc = etree.parse(xsl_path)
                _XSLT_TRANSFORM = etree.XSLT(xslt_doc)
        except Exception:
            _XSLT_TRANSFORM = False
    return _XSLT_TRANSFORM if _XSLT_TRANSFORM is not False else None

def latex_to_omml_ast(latex_str, color_hex="63CAB7", sz=2000):
    transform = get_xslt_transform()
    if not transform:
        return None
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        if script_dir not in sys.path:
            sys.path.insert(0, script_dir)
        import latex2mathml.converter
        from lxml import etree

        mathml_str = latex2mathml.converter.convert(latex_str)
        mathml_dom = etree.fromstring(mathml_str.encode('utf-8'))
        omml_dom = transform(mathml_dom)

        m_ns = 'http://schemas.openxmlformats.org/officeDocument/2006/math'
        a_ns = 'http://schemas.openxmlformats.org/drawingml/2006/main'
        a14_ns = 'http://schemas.microsoft.com/office/drawing/2010/main'
        ns_map = {'m': m_ns, 'a': a_ns, 'a14': a14_ns}

        root = omml_dom.getroot()
        for r in root.xpath('.//m:r', namespaces=ns_map):
            rPr = etree.Element(f'{{{a_ns}}}rPr', sz=str(sz))
            solidFill = etree.SubElement(rPr, f'{{{a_ns}}}solidFill')
            etree.SubElement(solidFill, f'{{{a_ns}}}srgbClr', val=color_hex)
            r.insert(0, rPr)

        omml_xml = etree.tostring(root, encoding='utf-8').decode('utf-8')
        if omml_xml.startswith('<?xml'):
            omml_xml = omml_xml[omml_xml.find('?>')+2:].strip()

        return f'<a14:m xmlns:a14="{a14_ns}" xmlns:m="{m_ns}" xmlns:a="{a_ns}">{omml_xml}</a14:m>'
    except Exception:
        return None

def latex_to_unicode(latex):
    """Converts inline LaTeX expressions into clean, readable Unicode math."""
    s = latex.strip()
    s = re.sub(r'\\(?:text|mathrm|mathbf|mathit)\{([^}]+)\}', r' \1 ', s)
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

def parse_latex_to_omml_xml(latex_str, color_hex="63CAB7", sz=2000):
    """
    Converts LaTeX to PowerPoint native OMML wrapped in DrawingML a14:m element.
    Uses professional AST pipeline (latex2mathml + Microsoft MML2OMML.XSL)
    with graceful fallback to direct token parser for malformed inputs.
    Prevents equations and formulas from breaking in between across lines
    using OOXML <m:box><m:boxPr><m:noBreak m:val="on"/></m:boxPr><m:e>...</m:e></m:box>,
    unless the equation is explicitly multi-line or longer than a single slide line (> 75 chars).
    """
    s = latex_str.strip().strip('$')
    s = normalize_fractions(s)

    # 1. Try standard AST pipeline (compiler-grade MathML -> OMML)
    xml = None
    try:
        xml = latex_to_omml_ast(s, color_hex, sz)
    except Exception:
        pass

    # 2. Fallback to direct token parser for malformed or trick inputs
    if not xml:
        nodes = parse_math_tokens(s, color_hex, sz)
        omml_body = "".join(nodes)
        xml = f'<a14:m xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><m:oMath>{omml_body}</m:oMath></a14:m>'

    if not xml:
        return None

    # Check if this equation can fit on one line
    # (Allow breaking only if it is explicitly multi-line with \\ or longer than 75 display characters)
    clean_repr = latex_to_unicode(s)
    is_multiline = ('\\\\' in s) or ('\\begin{' in s and 'matrix' not in s)
    is_too_long = len(clean_repr) > 75

    if is_multiline or is_too_long:
        return xml

    # Wrap oMath children in an unbreakable OOXML box:
    # <m:box><m:boxPr><m:noBreak m:val="on"/></m:boxPr><m:e> ... </m:e></m:box>
    try:
        from lxml import etree
        root = etree.fromstring(xml.encode('utf-8'))
        m_ns = 'http://schemas.openxmlformats.org/officeDocument/2006/math'
        omath = root.find(f'{{{m_ns}}}oMath')
        if omath is not None and len(omath) > 0:
            box = etree.Element(f'{{{m_ns}}}box')
            boxPr = etree.SubElement(box, f'{{{m_ns}}}boxPr')
            noBreak = etree.SubElement(boxPr, f'{{{m_ns}}}noBreak')
            noBreak.set(f'{{{m_ns}}}val', 'on')
            e_elem = etree.SubElement(box, f'{{{m_ns}}}e')
            for child in list(omath):
                e_elem.append(child)
            omath.append(box)
            return etree.tostring(root, encoding='utf-8').decode('utf-8')
    except Exception:
        pass

    return xml

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
    norm = normalize_fractions(opt_text)
    clean = latex_to_unicode(norm.replace('$', ''))
    full_str = f"({label}) {clean}"
    char_len = len(full_str)
    # Average Pt(20) character is ~0.155 in wide + 0.45 in padding
    est_w = Inches(char_len * 0.155 + 0.45)
    return min(max(Inches(1.8), est_w), CW)

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

def add_paragraph_runs(p, text, font_size=None, is_question_start=False, is_note_title=False):
    """Appends styled runs to paragraph p, handling Assamese, English, inline $math$, and note titles."""
    # Wrap bare LaTeX commands (e.g. \frac{m}{s} outside $) into $...$
    text = wrap_bare_latex(text)
    tokens = re.split(r'(\$[^$]+\$)', text)
    sz_pt = 22 if is_note_title else 21
    if font_size is not None and not is_note_title:
        try:
            sz_pt = font_size.pt
        except AttributeError:
            sz_pt = font_size
    sz_val = int(sz_pt * 100)

    first_text = True
    for tok in tokens:
        if not tok: continue
        if tok.startswith('$') and tok.endswith('$'):
            first_text = False
            # Inline math
            math_expr = tok[1:-1].strip()
            # Try native OMML with horizontal fraction bar
            try:
                omml_xml = parse_latex_to_omml_xml(math_expr, color_hex="63CAB7", sz=sz_val)
                p._p.append(parse_xml(omml_xml))
            except Exception:
                r = p.add_run()
                clean_math = latex_to_unicode(math_expr)
                if ('\\\\' not in math_expr) and len(clean_math) <= 75:
                    clean_math = clean_math.replace(' ', '\u00A0')
                r.text = clean_math
                set_run_font(r, 'Cambria Math', size=font_size or Pt(21), italic=True, color=ACCENT)
        else:
            # Normal text (Assamese and English)
            has_as = is_assamese(tok)
            sz = Pt(22) if is_note_title else (font_size or Pt(22 if has_as else 21))
            col = ACCENT if is_note_title else (WHITE if has_as else LGRAY)
            bold_val = True if is_note_title else False

            # Highlight question prefix like "Q1.", "Q2.", etc. in bold ACCENT
            if is_question_start and first_text and not is_note_title:
                m_q = re.match(r'^(Q\d+\.)\s*(.*)', tok)
                if m_q:
                    r_q = p.add_run()
                    r_q.text = m_q.group(1) + ' '
                    set_run_font(r_q, 'Banikanta', size=sz, bold=True, color=ACCENT)
                    first_text = False
                    remainder = m_q.group(2)
                    if remainder:
                        r = p.add_run()
                        r.text = remainder
                        set_run_font(r, 'Banikanta', size=sz, color=col)
                    continue

            first_text = False
            r = p.add_run()
            r.text = tok
            set_run_font(r, 'Banikanta', size=sz, bold=bold_val, color=col)

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

    ML = Inches(0.6)
    content_top = Inches(0.4)
    CW = Inches(13.333) - Inches(1.2)
    CH = Inches(7.5) - content_top - Inches(0.45)

    for idx, q in enumerate(questions):
        slide = prs.slides.add_slide(prs.slide_layouts[6]) # blank layout
        
        # 1. Dark Background
        bg = slide.background.fill
        bg.solid()
        bg.fore_color.rgb = BG

        # 2. Process Question Text and Options
        raw_text = strip_citations(q.get('question', ''))
        raw_options = q.get('options', [])
        options  = [strip_citations(o) for o in raw_options]
        is_mcq   = q.get('is_mcq', len(options) > 0)

        # Extract exam year / source tag (from q.year or end of question text)
        year_tag = str(q.get('year', '')).strip()
        m_year_end = re.search(r'(\[(?:JEE|NEET|CBSE|AHSEC|IIT|AIEEE|Board|\d{4})[^\]]*\]|\((?:19|20)\d\d\))\s*$', raw_text, re.IGNORECASE)
        if m_year_end:
            if not year_tag:
                year_tag = m_year_end.group(1).strip('[]() ')
            raw_text = raw_text[:m_year_end.start()].rstrip()

        # Determine whether this slide is a Note / Theory card or a Question
        q_type = str(q.get('type', '')).strip().lower()
        if q_type == 'note' or q.get('is_note') is True:
            is_note = True
        elif q_type in ['question', 'numerical', 'integer', 'subjective', 'problem', 'exercise']:
            is_note = False
        else:
            # Auto-detect when type is not explicitly declared
            if is_mcq:
                is_note = False
            else:
                # Content has clear note structure: bullet points or "Title:\n" without question marks or question numbering
                has_bullets = any(line.strip().startswith(('•', '-', '*')) for line in raw_text.splitlines())
                has_title_colon = bool(re.match(r'^[A-Z][A-Za-z0-9\s,&\'\-()]+\s*:\s*(?:\n|$)', raw_text))
                has_question_marks = ('?' in raw_text) or bool(re.search(r'^\s*(?:Q(?:uestion)?\s*\d+|\d+[\.:\-\)])', raw_text, re.IGNORECASE))
                is_note = (has_bullets or has_title_colon) and not has_question_marks

        # 1b. Slide Top Header Row (Left: Exam / Subject, Right: Year Tag Badge)
        has_header = bool(exam_lbl or year_tag or subject)
        if has_header:
            left_lbl = exam_lbl if exam_lbl else (subject if subject else '')
            if left_lbl:
                tb_hl = slide.shapes.add_textbox(ML, Inches(0.30), Inches(7.5), Inches(0.35))
                tb_hl.text_frame.margin_left = tb_hl.text_frame.margin_right = tb_hl.text_frame.margin_top = tb_hl.text_frame.margin_bottom = 0
                p_hl = tb_hl.text_frame.paragraphs[0]
                r_hl = p_hl.add_run()
                r_hl.text = left_lbl
                set_run_font(r_hl, 'Banikanta', size=Pt(11.5), color=MUTED)

            if year_tag:
                tb_yr = slide.shapes.add_textbox(SW - ML - Inches(4.5), Inches(0.28), Inches(4.5), Inches(0.35))
                tb_yr.text_frame.margin_left = tb_yr.text_frame.margin_right = tb_yr.text_frame.margin_top = tb_yr.text_frame.margin_bottom = 0
                p_yr = tb_yr.text_frame.paragraphs[0]
                p_yr.alignment = PP_ALIGN.RIGHT
                r_yr = p_yr.add_run()
                r_yr.text = f"[ {year_tag} ]"
                set_run_font(r_yr, 'Banikanta', size=Pt(12), bold=True, color=ACCENT)

        slide_content_top = Inches(0.80) if has_header else Inches(0.40)
        slide_ch = Inches(7.5) - slide_content_top - Inches(0.45)

        q_num = q.get('id')
        if q_num is None or str(q_num).strip() == '':
            q_num = idx + 1

        if not is_note:
            q_prefix = f"Q{q_num}."
            clean_text = re.sub(r'^(?:Q(?:uestion)?\s*\d+[\.:\-\)]*|\d+[\.:\-\)])\s*', '', raw_text, flags=re.IGNORECASE).strip()
            raw_text = f"{q_prefix} {clean_text}"
        else:
            raw_text = re.sub(r'^(?:Q(?:uestion)?\s*\d+[\.:\-\)]*)\s*', '', raw_text, flags=re.IGNORECASE).strip()

        # Determine ideal proportional font size based on total question length
        total_chars = len(raw_text)
        has_as = is_assamese(raw_text)

        if total_chars < 200:
            q_font_pt = 22 if has_as else 21
        elif total_chars < 350:
            q_font_pt = 21 if has_as else 20
        else:
            q_font_pt = 19.5 if has_as else 19

        q_font_size = Pt(q_font_pt)

        # Convert $$display$$ equations into standalone lines
        proc_text = re.sub(r'\$\$(.+?)\$\$', r'\n$\1$\n', raw_text)

        # 3. Add Single Unified Native Text Frame
        # Placing question and options in the same text frame allows PowerPoint's native
        # text layout engine to format exact paragraph positioning automatically.
        # This completely eliminates both manual coordinate overlaps and large artificial gaps.
        tb = slide.shapes.add_textbox(ML, slide_content_top, CW, slide_ch)
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

        # Split into non-empty question lines/paragraphs
        q_lines = [l.strip() for l in proc_text.split('\n') if l.strip()]
        for l_idx, line in enumerate(q_lines):
            p = tf.paragraphs[0] if l_idx == 0 else tf.add_paragraph()
            is_last_q_line = (l_idx == len(q_lines) - 1)
            is_title_line = (is_note and l_idx == 0)

            if is_title_line:
                # Note topic heading in bold accent teal with comfortable paragraph spacing
                p.space_after = Pt(12)
                add_paragraph_runs(p, line, font_size=Pt(22), is_note_title=True)
            else:
                # Natural, compact paragraph break between question and MCQ options: 14pt (0.19 in)
                p.space_after = Pt(14) if is_last_q_line else Pt(5)
                add_paragraph_runs(p, line, font_size=q_font_size, is_question_start=(l_idx == 0 and not is_note))

        # 4. MCQ Options (Seamlessly following question with natural paragraph spacing)
        if is_mcq and options:
            for i in range(min(4, len(options))):
                opt_str = str(options[i]).strip()
                if not opt_str:
                    continue

                p_opt = tf.add_paragraph()
                p_opt.space_after = Pt(8)

                # Label (A), (B), (C), (D) in bold accent
                r_lbl = p_opt.add_run()
                r_lbl.text = f'({LABELS[i]}) '
                set_run_font(r_lbl, 'Banikanta', size=Pt(20), bold=True, color=ACCENT)

                # Set paragraph-level defRPr so OMML math inherits Pt(20) and ACCENT color
                pPr = p_opt._p.find('{http://schemas.openxmlformats.org/drawingml/2006/main}pPr')
                if pPr is None:
                    pPr = parse_xml('<a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:defRPr sz="2000"><a:solidFill><a:srgbClr val="63CAB7"/></a:solidFill></a:defRPr></a:pPr>')
                    p_opt._p.insert(0, pPr)

                norm_opt = normalize_fractions(opt_str)
                is_math = ('$' in norm_opt) or ('\\frac' in norm_opt) or ('\\sqrt' in norm_opt) or ('/' in norm_opt and re.search(r'[a-zA-Z0-9]/[a-zA-Z0-9]', norm_opt)) or re.search(r'^[a-zA-Z]\s*=\s*', norm_opt)

                if '$' in norm_opt:
                    add_paragraph_runs(p_opt, norm_opt, font_size=Pt(20))
                elif is_math and not is_assamese(norm_opt):
                    add_paragraph_runs(p_opt, f'${norm_opt}$', font_size=Pt(20))
                else:
                    c_r = p_opt.add_run()
                    c_r.text = norm_opt
                    set_run_font(c_r, 'Banikanta', size=Pt(20), color=WHITE)

        # 5. Slide number footer
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
