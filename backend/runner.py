#!/usr/bin/env python3
"""
Bootstrap Python Runner for PPT Maker
Bundles Python, python-pptx, matplotlib, PIL, numpy once with PyInstaller.
Dynamically executes the external math_to_ppt.py script so bug fixes
can be updated instantly without recompiling the executable!
"""
import sys
import os
import io
import re
import json
import traceback

# Pre-import all heavy libraries so PyInstaller bundles them
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_AUTO_SIZE
from pptx.oxml import parse_xml
from PIL import Image
import numpy

def get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: runner <input_json_path> <output_pptx_path> [script_path]"
        }))
        sys.exit(1)

    json_path = sys.argv[1]
    out_path  = sys.argv[2]

    # Optional custom script path (e.g. from app userData or local sync)
    script_path = sys.argv[3] if len(sys.argv) > 3 else None

    if not script_path or not os.path.exists(script_path):
        script_path = os.path.join(get_base_dir(), 'math_to_ppt.py')

    if not os.path.exists(script_path):
        # Also check relative to current working directory
        alt_path = os.path.join(os.getcwd(), 'backend', 'math_to_ppt.py')
        if os.path.exists(alt_path):
            script_path = alt_path

    if not os.path.exists(script_path):
        print(json.dumps({
            "success": False,
            "error": f"math_to_ppt.py not found at: {script_path}"
        }))
        sys.exit(1)

    try:
        with open(json_path, 'r', encoding='utf-8-sig') as f:
            data = json.load(f)

        # Dynamically load math_to_ppt module
        import importlib.util
        spec = importlib.util.spec_from_file_location("math_to_ppt", script_path)
        if not spec or not spec.loader:
            raise RuntimeError(f"Cannot load module spec from {script_path}")

        math_module = importlib.util.module_from_spec(spec)
        sys.modules["math_to_ppt"] = math_module
        spec.loader.exec_module(math_module)

        # Call generate
        if hasattr(math_module, 'generate'):
            result = math_module.generate(data, out_path)
            print(json.dumps(result))
        else:
            raise RuntimeError("math_to_ppt.py does not define a 'generate(data, output_path)' function")

    except Exception as exc:
        print(json.dumps({
            "success": False,
            "error": str(exc),
            "tb": traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
