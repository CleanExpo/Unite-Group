# Git Remote Repository Setup Guide

## Important: Supabase vs Git Repository

- **Supabase URL** (`https://uqfgdezadpkiadugufbs.supabase.co`): This is for your DATABASE and BACKEND services
- **Git Repository URL**: This is for CODE version control (GitHub, GitLab, Bitbucket, etc.)

## Setting Up a Git Remote Repository

### Option 1: Using GitHub (Recommended)

1. **Create a GitHub Repository:**
   - Go to https://github.com/new
   - Name it: `unite-group`
   - Choose Private or Public
   - Don't initialize with README (we already have files)
   - Click "Create repository"

2. **Add GitHub as Remote:**
   ```bash
   cd Unite-Group
   git remote add origin https://github.com/YOUR_USERNAME/unite-group.git
   git branch -M main
   git push -u origin main
   ```

### Option 2: Using GitLab

1. **Create a GitLab Repository:**
   - Go to https://gitlab.com/projects/new
   - Name it: `unite-group`
   - Set visibility level
   - Click "Create project"

2. **Add GitLab as Remote:**
   ```bash
   cd Unite-Group
   git remote add origin https://gitlab.com/YOUR_USERNAME/unite-group.git
   git branch -M main
   git push -u origin main
   ```

### Option 3: Using Bitbucket

1. **Create a Bitbucket Repository:**
   - Go to https://bitbucket.org/repo/create
   - Name it: `unite-group`
   - Choose access level
   - Click "Create repository"

2. **Add Bitbucket as Remote:**
   ```bash
   cd Unite-Group
   git remote add origin https://bitbucket.org/YOUR_USERNAME/unite-group.git
   git branch -M main
   git push -u origin main
   ```

## If You Need a Free Private Repository

- **GitHub**: Free private repositories with unlimited collaborators
- **GitLab**: Free private repositories with unlimited collaborators
- **Bitbucket**: Free for up to 5 users

## Next Steps

1. Choose a git hosting service
2. Create an account if you don't have one
3. Create a new repository
4. Use the provided URL to add as remote origin
5. Push your code

## Common Commands

```bash
# Check current remotes
git remote -v

# Remove incorrect remote
git remote remove origin

# Add correct remote
git remote add origin [YOUR_GIT_REPOSITORY_URL]

# Push to remote
git push -u origin main
```

## Remember

- Supabase = Database/Backend hosting
- GitHub/GitLab/Bitbucket = Code repository hosting
- They serve different purposes in your project
