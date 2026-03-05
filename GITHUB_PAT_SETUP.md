# GitHub Personal Access Token (PAT) - Least Privilege Setup

## 🎯 Purpose
Generate a new GitHub PAT with **only the permissions you actually need** to minimize security risk if it's ever compromised.

## 📋 Step-by-Step Instructions

### 1. Navigate to GitHub Token Settings
1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Or: GitHub → Settings (top-right) → Developer settings (bottom-left) → Personal access tokens → Tokens (classic)

### 2. Generate New Token
Click **"Generate new token"** → **"Generate new token (classic)"**

### 3. Configure Token

**Token Name**: `TrafficJamz-Deployment-2026` (or similar descriptive name)

**Expiration**: Choose based on your needs:
- **90 days** (Recommended) - Balance of convenience and security
- **Custom** - Set specific date for rotation schedule
- **No expiration** - ⚠️ Only if absolutely necessary

### 4. Select Scopes (Permissions)

Choose **ONLY** what you need. Here are common scenarios:

#### Scenario A: CI/CD Deployment Only
Minimal permissions for automated deployments:
- ✅ `repo` (Full control of private repositories)
  - Allows: Push code, create releases, read repo
  - Why: Needed for deployment workflows

#### Scenario B: Package Publishing (npm, Docker, etc.)
For publishing packages to GitHub Packages:
- ✅ `write:packages` (Upload packages to GitHub Package Registry)
- ✅ `read:packages` (Download packages from GitHub Package Registry)
- ✅ `repo` (if packages are in private repos)

#### Scenario C: GitHub Actions Read/Write
For CI/CD that modifies workflow files:
- ✅ `workflow` (Update GitHub Action workflows)
- ✅ `repo`

#### Scenario D: Status/Deployments (Vercel, Netlify, etc.)
For deployment platforms that report status:
- ✅ `repo:status` (Access commit status)
- ✅ `repo_deployment` (Access deployment status)
- ✅ `public_repo` (if working with public repos only)

#### Scenario E: Read-Only Access
For tools that only need to read your code:
- ✅ `repo` **OR** `public_repo` (depending on privacy)
  - **public_repo**: Only if you NEVER need private repo access
  - **repo**: If you might need private repo access

### ⚠️ Scopes to AVOID Unless Absolutely Necessary

❌ **admin:org** - Organization administration (rarely needed)
❌ **admin:public_key** - SSH key management (almost never needed for deployment)
❌ **admin:repo_hook** - Webhook management (only for integration platforms)
❌ **admin:org_hook** - Organization webhooks (almost never needed)
❌ **delete_repo** - Repository deletion (dangerous!)
❌ **user** - User profile modification (not needed for deployment)

## 🔧 Recommended Setup for TrafficJamz

Based on your current setup (DigitalOcean deployment, Vercel frontend, GitHub Actions):

### ✅ Recommended Scopes:
```
✅ repo                    (Full repo access - needed for pull/push)
✅ workflow                (Update GitHub Actions - if you use CI/CD)
✅ write:packages          (If using GitHub Container Registry)
✅ read:packages           (If using GitHub Container Registry)
```

### ❌ Do NOT enable:
```
❌ admin:*                 (Not needed for deployment)
❌ delete_repo             (Dangerous!)
❌ user                    (Not needed)
❌ admin:public_key        (Not needed)
```

## 💾 After Generation

### 1. Copy Token Immediately
- **You will only see it once!**
- Click the copy button or select and copy manually

### 2. Save Securely
**Option A: Password Manager** (Recommended)
- 1Password, LastPass, Bitwarden, etc.
- Store as "GitHub PAT - TrafficJamz"
- Include expiration date in notes

**Option B: Environment Variable**
```bash
# On production server
echo 'export GITHUB_TOKEN="ghp_..."' >> ~/.bashrc
source ~/.bashrc

# Verify (should show the token)
echo $GITHUB_TOKEN
```

**Option C: GitHub Secrets** (for GitHub Actions)
- Repository → Settings → Secrets and variables → Actions
- Add as `GH_TOKEN` or `PAT_TOKEN`

### 3. Update Deployments
Replace the old token everywhere it's used:
- DigitalOcean droplet (if used for git operations)
- Vercel (if using for deployment)
- GitHub Actions workflows
- Local development environment
- Any automation scripts

### 4. Test Immediately
```bash
# Test token works for git operations
git clone https://ghp_YOURTOKEN@github.com/richcobrien1/TrafficJamz.git test-auth
cd test-auth
echo "test" >> README.md
git add README.md
git commit -m "test: verify PAT permissions"
git push
cd ..
rm -rf test-auth

# If all works, token is configured correctly!
```

## 🔄 Token Rotation Schedule

Set a reminder to rotate your token:
- **90-day token**: Rotate every 3 months
- **Custom expiration**: 1 week before expiry
- **No expiration**: Rotate every 6 months minimum

### Quick Rotation Process:
1. Generate new token (follow this guide)
2. Update all systems with new token
3. Test thoroughly
4. Revoke old token
5. Update documentation with new expiration date

## 🚨 If Token Is Compromised

1. **Immediately revoke**: [https://github.com/settings/tokens](https://github.com/settings/tokens) → Find token → Delete
2. **Check Recent Activity**: Repository → Insights → Recent commits/pushes
3. **Generate new token** with minimum required scopes
4. **Review security logs**: Settings → Security log
5. **Consider enabling 2FA** if not already active

## 📊 Current Status

- ❌ Old token: **REVOKED** (March 5, 2026)
- ⏳ New token: **TO BE GENERATED**
- 🎯 Recommended scopes: `repo`, `workflow`, `write:packages`, `read:packages`
- 📅 Recommended expiration: **90 days** (June 3, 2026)

## 🔗 Useful Links

- [GitHub PAT Documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [GitHub Scopes Explained](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
- [Token Security Best Practices](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation)

---

**Next Steps:**
1. ✅ Read this guide
2. 🔗 [Generate token now](https://github.com/settings/tokens/new)
3. 💾 Save securely in password manager
4. 🔄 Update all systems using the token
5. 🧪 Test git operations
6. ✅ Mark as complete!
