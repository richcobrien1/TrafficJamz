# TrafficJamz Pre-commit Hook Setup

## 🔒 Secret Detection Protection

This repository has **two layers** of secret detection to prevent accidentally committing sensitive information:

### Layer 1: Git Hook (Immediate, Offline)
- **Location**: `.git/hooks/pre-commit`
- **Activation**: Already active! Works immediately on every commit
- **Detects**:
  - GitHub Personal Access Tokens (all types)
  - Mapbox tokens (public and secret)
  - AWS credentials
  - API keys and secret keys
  - Database connection strings with passwords
  - Private keys (RSA, DSA, EC)
  - Generic password patterns
- **Action**: Blocks commit and shows what was detected

### Layer 2: Pre-commit Framework (Advanced, Requires Setup)
- **Location**: `.pre-commit-config.yaml`
- **Setup Required**:
  ```bash
  # Install pre-commit framework
  pip install pre-commit
  
  # Install the hooks
  pre-commit install
  
  # (Optional) Run on all existing files
  pre-commit run --all-files
  ```
- **Features**:
  - `detect-secrets` - Pattern-based secret detection
  - `gitleaks` - Comprehensive secret scanning
  - `detect-private-key` - SSH/TLS key detection
  - `detect-aws-credentials` - AWS-specific credential detection
  - Large file detection (>1MB)
  - YAML validation
  - No direct commits to main branch

## 🚀 Usage

### Normal Workflow (Automatic)
```bash
git add .
git commit -m "your message"
# Hook runs automatically and blocks if secrets detected
```

### If Hook Detects Secrets
```bash
# 1. Remove the secret from your code
# 2. Use environment variables instead
# 3. Unstage the file if needed:
git reset HEAD <file>

# 4. Try commit again
git commit -m "your message"
```

### Bypass Hook (⚠️ USE WITH CAUTION)
```bash
# Only if you're absolutely sure there are no real secrets
git commit --no-verify -m "your message"
```

### Manual Check (Before Committing)
```bash
# Check all staged files
.git/hooks/pre-commit

# Or with pre-commit framework:
pre-commit run --all-files
```

## 📋 What Files Are Always Flagged?

These file patterns always trigger warnings:
- `*.env*` - Environment files
- `*.key`, `*.pem`, `*.p12`, `*.pfx` - Key files
- `*secret*`, `*credential*`, `*password*` - Sensitive naming
- `.npmrc`, `.pypirc` - Package manager configs

**These should NEVER be committed to git!**

## 🔧 Maintenance

### Update Hook
Edit `.git/hooks/pre-commit` to add new secret patterns

### Update Pre-commit Framework
```bash
pre-commit autoupdate
```

### Generate Secrets Baseline (If Using detect-secrets)
```bash
detect-secrets scan > .secrets.baseline
# Review and edit .secrets.baseline to whitelist false positives
```

## 📝 Best Practices

1. **Always use .env files** (excluded from git via .gitignore)
2. **Test the hook** before committing sensitive changes
3. **Review warnings** even if commit is allowed
4. **Never use --no-verify** unless you understand the risk
5. **Rotate any accidentally committed secrets immediately**

## 🆘 Emergency: Secret Was Committed

If you accidentally commit a secret despite these protections:

1. **Revoke the secret immediately** (GitHub, AWS, Mapbox, etc.)
2. **Remove from git history**:
   ```bash
   # Add to filter-expressions.txt
   echo "regex:YOUR_SECRET_PATTERN===>***REMOVED***" >> filter-expressions.txt
   
   # Rewrite history
   git-filter-repo --replace-text filter-expressions.txt --force
   
   # Force push
   git remote add origin <url>
   git push --force --all origin
   ```
3. **Generate new credentials**
4. **Update all systems using the old secret**

## 📊 Hook Status

- ✅ Git pre-commit hook: **ACTIVE**
- ⏳ Pre-commit framework: **Optional (run `pre-commit install` to activate)**

Last updated: March 5, 2026
