# Mac Mini Recovery Alternatives

**Asset:** Mac Mini (phills-mac-mini.local)
**Status:** RECOVERY BLOCKED
**Last Attempt:** 2026-05-26
**Owner:** Nexus Security & DR Lead

---

## Current Blocker

- SSH (port 22): Unreachable from MacBook session
- SMB (port 445): Reachable but unauthenticated
- No authenticated mount established
- Target files not found in `/Volumes` searches

## Target Files (from UNI-2054)

1. `/Users/phill-mac/hermes-agent-enhancement-report/MARGOT-COMMAND-CENTER.md`
2. `/Users/phill-mac/hermes-agent-enhancement-report/restoreassist-content-packs/RESTOREASSIST-CONTENT-INDEX.md`

---

## Recovery Options (Ranked by Feasibility)

### Option 1: Physical Access (HIGHEST SUCCESS PROBABILITY)

**Steps:**
1. Physically access the Mac Mini
2. Log in with local credentials
3. Navigate to target directories
4. Copy files to USB drive or external storage
5. Transfer to MacBook
6. Verify file integrity

**Requirements:**
- Physical presence at Mac Mini location
- Local login credentials
- External storage device

**Risk:** Low (direct access)

---

### Option 2: Enable Remote Access via Local Session

**Steps:**
1. Physically access Mac Mini (or have someone who can)
2. Open System Preferences → Sharing
3. Enable:
   - Screen Sharing (VNC)
   - Remote Login (SSH)
   - Remote Management
4. Note the Mac Mini's current IP address
5. From MacBook: connect via VNC or SSH
6. Extract target files

**Requirements:**
- Someone with physical access
- Admin credentials for Mac Mini
- Network connectivity between devices

**Risk:** Medium (requires coordination)

---

### Option 3: SMB Authentication via Finder

**Steps:**
1. On MacBook, open Finder
2. Go → Connect to Server (Cmd+K)
3. Enter: `smb://phills-mac-mini.local` or `smb://192.168.2.77`
4. Authenticate with Mac Mini credentials
5. Navigate to target directories
6. Copy files to local storage

**Requirements:**
- Mac Mini SMB credentials
- Mac Mini must have File Sharing enabled
- Same network segment

**Risk:** Medium (authentication may fail)

---

### Option 4: Time Machine Backup Recovery

**Steps:**
1. Check if Mac Mini has Time Machine backups
2. If backups exist on external drive or NAS:
   - Connect backup drive to MacBook
   - Use Migration Assistant or browse Time Machine
   - Extract target files
3. If backups exist in iCloud/Cloud Storage:
   - Log into cloud storage
   - Download target files

**Requirements:**
- Time Machine was configured and running
- Backup media is accessible

**Risk:** High (uncertain if backups exist)

---

### Option 5: Reconstruct from Available Sources

**If physical recovery fails, reconstruct:**

#### MARGOT-COMMAND-CENTER.md
- **Source:** Current repo state + session history
- **Location:** `docs/margot/MARGOT-COMMAND-CENTER.md` (already exists, may be older version)
- **Reconstruction:**
  1. Read current `docs/margot/MARGOT-COMMAND-CENTER.md`
  2. Review recent session history for Margot-related changes
  3. Interview Phill about current Margot capabilities
  4. Update document with current state

#### RESTOREASSIST-CONTENT-INDEX.md
- **Source:** YouTube videos + local video files
- **Locations:**
  - YouTube: 6 onboarding videos (check channel)
  - Local: `public/videos/help/` (6 help MP4s)
- **Reconstruction:**
  1. List all videos in `public/videos/help/`
  2. Check YouTube channel for onboarding videos
  3. Create new index document
  4. Map videos to categories and purposes

---

## Decision Required from Board

| Option | Effort | Success Probability | Recommendation |
|--------|--------|-------------------|----------------|
| 1. Physical Access | High | 95% | **PREFERRED** |
| 2. Enable Remote Access | Medium | 80% | Good alternative |
| 3. SMB Authentication | Low | 50% | Worth trying first |
| 4. Time Machine | Low | 30% | Quick check |
| 5. Reconstruct | Medium | 90% | Fallback if all else fails |

**Recommended Path:**
1. Try Option 3 (SMB) immediately — lowest effort
2. If SMB fails, try Option 4 (Time Machine) — quick check
3. If both fail, proceed with Option 1 (Physical Access) — highest confidence
4. Begin Option 5 (Reconstruct) in parallel — ensures no blockers

---

## Prevention Measures

1. **All critical documents in Git:**
   - `docs/margot/` should be the canonical location
   - Mac Mini should not be primary storage for any document

2. **Cloud sync for local files:**
   - Enable iCloud Drive / Dropbox / OneDrive for `~/Documents`
   - Ensure `hermes-agent-enhancement-report/` is cloud-synced

3. **Regular exports:**
   - Monthly export of important local directories to cloud storage
   - Automated if possible

4. **Device redundancy:**
   - Maintain at least 2 development environments
   - Both should have identical access to all resources

---

**Document Status:** ACTIVE
**Next Review:** After recovery attempt or 2026-06-15
**Board Decision Required:** Yes — approve recovery path
