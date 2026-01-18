# Version Management Guide

This document explains how to ensure consistent development environments across the team.

## Overview

To ensure all developers use the same versions of dependencies and runtime environments, this project uses the following version pinning mechanisms:

- **Python**: `.python-version` files (for pyenv) + `requirements.txt` with pinned versions
- **Node.js**: `.nvmrc` files (for nvm) + `package-lock.json` for exact dependency versions

## Required Versions

- **Python**: 3.14.2 (specified in `.python-version` and `backend/.python-version`)
- **Node.js**: 25.2.1 (specified in `.nvmrc` and `Frontend/.nvmrc`)

## Setup Instructions

### Python Environment Setup

#### Using pyenv (Recommended)

1. **Install pyenv** (if not already installed):
   ```bash
   # macOS
   brew install pyenv
   
   # Linux
   curl https://pyenv.run | bash
   ```

2. **Install the required Python version**:
   ```bash
   cd backend
   pyenv install 3.14.2
   ```

3. **Set local Python version**:
   ```bash
   pyenv local 3.14.2
   ```
   (This creates/updates `.python-version` automatically)

4. **Create and activate virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On macOS/Linux
   # or
   venv\Scripts\activate  # On Windows
   ```

5. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

#### Without pyenv

1. **Check your Python version**:
   ```bash
   python3 --version  # Should be 3.14.2
   ```

2. **Create and activate virtual environment**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

### Node.js Environment Setup

#### Using nvm (Recommended)

1. **Install nvm** (if not already installed):
   ```bash
   # macOS/Linux
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Or on macOS with Homebrew
   brew install nvm
   ```

2. **Install and use the required Node.js version**:
   ```bash
   cd Frontend
   nvm install  # Reads .nvmrc automatically
   nvm use      # Switches to the version in .nvmrc
   ```

   Or manually:
   ```bash
   nvm install 25.2.1
   nvm use 25.2.1
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

   ⚠️ **Important**: Always commit `package-lock.json` to ensure exact dependency versions!

#### Without nvm

1. **Check your Node.js version**:
   ```bash
   node --version  # Should be v25.2.1
   ```

2. **Install dependencies**:
   ```bash
   cd Frontend
   npm install
   ```

## Ensuring Version Consistency

### For Contributors

1. **Always use the specified versions**:
   - Check `.python-version` and `.nvmrc` files before starting development
   - Use `pyenv` or `nvm` to switch to the correct versions automatically

2. **Never commit changes to `package.json` or `requirements.txt` without updating lock files**:
   - For Python: Run `pip freeze > requirements.txt` after adding dependencies (or use `pip-compile` if using pip-tools)
   - For Node: Run `npm install <package>` which automatically updates `package-lock.json`

3. **Always commit lock files**:
   - `package-lock.json` ✅ Must be committed
   - `requirements.txt` ✅ Must be committed (with pinned versions)

### For Maintainers

#### Updating Python Dependencies

1. **Add/update a dependency**:
   ```bash
   pip install <package>==<version>
   ```

2. **Update requirements.txt**:
   ```bash
   pip freeze > requirements.txt
   ```

   Or for a cleaner approach, manually edit `requirements.txt` and run:
   ```bash
   pip install -r requirements.txt
   ```

#### Updating Node.js Dependencies

1. **Add/update a dependency**:
   ```bash
   npm install <package>@<version>
   ```

2. **Verify `package-lock.json` is updated**:
   ```bash
   git status  # Should show changes to package-lock.json
   ```

3. **Test the installation on a clean environment**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

## Verifying Your Setup

### Python Verification

```bash
cd backend
python --version  # Should show Python 3.14.2
which python      # Should point to your venv or pyenv version
```

### Node.js Verification

```bash
cd Frontend
node --version    # Should show v25.2.1
npm --version     # Verify npm is working
```

## Troubleshooting

### "Python version not found"
- Install the required version with `pyenv install 3.14.2`
- Or update `.python-version` if you're using a different but compatible version (check compatibility first!)

### "Node version not found"
- Install the required version with `nvm install 25.2.1`
- Or update `.nvmrc` if you're using a different but compatible version

### Dependency conflicts
- Make sure you're using the exact versions specified in `requirements.txt` and `package-lock.json`
- Delete `venv/` or `node_modules/` and reinstall dependencies
- Check that your Python/Node versions match the specified versions

## CI/CD Integration

For CI/CD pipelines, make sure to:

1. **Set Python version**:
   ```yaml
   # Example for GitHub Actions
   - uses: actions/setup-python@v4
     with:
       python-version: '3.14.2'
   ```

2. **Set Node.js version**:
   ```yaml
   # Example for GitHub Actions
   - uses: actions/setup-node@v3
     with:
       node-version: '25.2.1'
   ```

3. **Install dependencies**:
   ```bash
   # Python
   pip install -r backend/requirements.txt
   
   # Node.js
   cd Frontend && npm ci  # Use npm ci for exact installs in CI
   ```

## Additional Notes

- **Virtual environments**: Always use virtual environments for Python development (never install globally)
- **Lock files**: Never ignore `package-lock.json` or `requirements.txt` in `.gitignore`
- **Version files**: Always commit `.nvmrc` and `.python-version` files
- **Team communication**: If you need to update a version, discuss with the team first and update all relevant files
