# 📋 Git Commands for GitHub Upload

Copy and paste these commands in the Replit terminal to upload your project to GitHub:

## Step 1: Initialize Git Repository
```bash
git init
```

## Step 2: Add All Project Files
```bash
git add .
```

## Step 3: Create Initial Commit
```bash
git commit -m "Complete Knets family device management system with native Android APK"
```

## Step 4: Set Main Branch
```bash
git branch -M main
```

## Step 5: Add GitHub Remote
**Replace YOUR_USERNAME and YOUR_REPO_NAME with your actual GitHub details:**
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

## Step 6: Push to GitHub
```bash
git push -u origin main
```

## Example with Real Repository Name:
```bash
git remote add origin https://github.com/johndoe/knets-family-control.git
git push -u origin main
```

## 🔑 Authentication
If prompted for username/password:
- **Username**: Your GitHub username
- **Password**: Use a Personal Access Token (not your GitHub password)
- Create token at: https://github.com/settings/tokens

## ✅ Success Indicators
After running these commands, you should see:
- Files uploaded to your GitHub repository
- GitHub Actions workflow automatically triggered
- APK build starting in the Actions tab

**Ready to upload? Run these commands in order!**