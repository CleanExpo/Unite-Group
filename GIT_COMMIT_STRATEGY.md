# Git Commit Strategy for Large Projects

## Problem Solved
- Previously: Git repository was initialized at Desktop level, tracking 108,553 files
- Now: Git repository properly initialized in Unite-Group folder, tracking only 539 relevant files
- Result: Commits are now manageable and within size limits

## Best Practices for Large Commits

### 1. Commit in Batches
When you have many changes, commit them in logical groups:
```bash
# Example: Commit frontend changes first
git add src/app/**
git commit -m "feat: Add frontend components"

# Then backend changes
git add src/lib/**
git commit -m "feat: Add backend services"

# Then configuration files
git add *.json *.config.* .env.example
git commit -m "chore: Update configuration files"
```

### 2. Use .gitignore Effectively
Our .gitignore already excludes:
- node_modules/
- .next/
- build/
- .env files
- Other generated files

### 3. Check File Count Before Committing
```bash
# Check how many files are staged
git status --short | Measure-Object -Line

# If too many, stage specific directories
git reset
git add [specific-directory]
```

### 4. Large File Handling
For files over 100MB, use Git LFS:
```bash
# Install Git LFS
git lfs install

# Track large files
git lfs track "*.psd"
git lfs track "*.zip"
git add .gitattributes
```

### 5. Automated Commit Script
Create a PowerShell script for safe commits:
```powershell
# safe-commit.ps1
$fileCount = (git status --short | Measure-Object -Line).Lines
if ($fileCount -gt 1000) {
    Write-Host "Warning: $fileCount files to commit. Consider splitting into smaller commits."
    $continue = Read-Host "Continue? (y/n)"
    if ($continue -ne 'y') { exit }
}
git commit -m $args[0]
```

## Repository Setup Commands

### Add Remote Origin
```bash
# Replace with your actual repository URL
git remote add origin https://github.com/yourusername/unite-group.git
```

### Push Initial Commit
```bash
git branch -M main
git push -u origin main
```

### For Future Large Changes
1. Always work within the Unite-Group directory
2. Commit frequently in small batches
3. Use descriptive commit messages
4. Review staged files before committing

## Emergency Recovery
If you encounter size limits again:
1. Reset the commit: `git reset --soft HEAD~1`
2. Unstage all files: `git reset`
3. Stage and commit in smaller batches
4. Use the file count check before each commit

## Git Configuration for Large Repos
```bash
# Increase buffer size
git config http.postBuffer 524288000

# Enable compression
git config core.compression 9

# Optimize performance
git config core.preloadindex true
git config core.fscache true
