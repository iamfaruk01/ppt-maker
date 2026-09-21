# PPT Maker ⚡

A standalone desktop application that converts Math, Science, and bilingual (Assamese & English) questions into clean 16:9 widescreen PowerPoint (`.pptx`) slides with authentic typography and LaTeX equation rendering.

- **Repository**: [https://github.com/iamfaruk01/ppt-maker](https://github.com/iamfaruk01/ppt-maker)

---

## 📦 How to Share with the Recipient

The pre-built executables are in the `dist/` directory:

1. **Portable Version** (Recommended):
   - File: `dist/PPT Maker 1.0.0.exe`
   - **Zero installation required**: The recipient simply double-clicks and runs it.
   - **Zero dependencies**: Does NOT need Python, Node.js, or any libraries on the recipient's PC.
   - Automatically registers the **Banikanta** Assamese font into Windows.

2. **Installer Version**:
   - File: `dist/PPT Maker Setup 1.0.0.exe`
   - Standard Windows setup installer that creates a desktop shortcut and start menu entry.

---

## 🔄 Instant 0.5-Second Bug Fix Updates (Without Reinstalling)

The app features a dynamic update architecture:
1. The heavy native libraries (`matplotlib`, `python-pptx`, `numpy`, `PIL`) and Electron runtime are bundled inside `python_runner.exe` and `PPT Maker.exe`.
2. The core slide generation logic lives in `backend/math_to_ppt.py`.
3. Whenever you discover a bug or want to tweak formatting, **you only need to edit `backend/math_to_ppt.py` and push it to this repository**:

```bash
git add backend/math_to_ppt.py
git commit -m "Fix question formatting"
git push
```

Within **0.5 seconds** of launching the app or generating slides, the app automatically fetches the latest ~15 KB script directly from GitHub. The user receives your fix instantly **without downloading or installing a new application!**

### 🔒 Note on Private vs Public Repository
- **If the repository is Public**: The app automatically fetches updates without needing any login or password.
- **If the repository is Private**: In the app's ⚙️ **Settings** modal, enter a GitHub Personal Access Token (fine-grained or classic with read access).

---

## 🚀 Pushing to GitHub

To initialize and push this project to your repository:

```bash
cd e:\dev\projects\ppt-maker
git init
git add .
git commit -m "Initial commit of PPT Maker"
git branch -M main
git remote add origin https://github.com/iamfaruk01/ppt-maker.git
git push -u origin main
```

---

## 🛠 Developer Commands

```bash
# Run in development mode
npm start

# Recompile the Python runner (if you ever add new heavy C-libraries)
npm run build:runner

# Build the portable .exe
npm run dist:portable

# Build the installer .exe
npm run dist:setup
```
