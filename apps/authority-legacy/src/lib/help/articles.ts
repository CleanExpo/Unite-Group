// src/lib/help/articles.ts
// Help center article data for the in-app self-service knowledge base.

export type HelpCategory =
  | "Getting Started"
  | "Billing"
  | "Account"
  | "API"
  | "Troubleshooting";

export interface HelpArticle {
  id: string;
  category: HelpCategory;
  title: string;
  excerpt: string;
  content: string; // Markdown string
  readTime: string;
}

export const HELP_CATEGORIES: HelpCategory[] = [
  "Getting Started",
  "Billing",
  "Account",
  "API",
  "Troubleshooting",
];

export const helpArticles: HelpArticle[] = [
  // ─── Getting Started ─────────────────────────────────────────────────────
  {
    id: "create-first-project",
    category: "Getting Started",
    title: "How to create your first project",
    excerpt:
      "Learn the basics of setting up your first project in Unite-Hub, from naming conventions to initial configuration.",
    readTime: "3 min read",
    content: `# How to Create Your First Project

Welcome to Unite-Hub! Creating your first project is quick and straightforward.

## Step 1: Navigate to Projects

From your dashboard, click on **Projects** in the left-hand sidebar, then click the **New Project** button in the top-right corner.

## Step 2: Project Details

Fill in the following fields:

- **Project Name** — Choose a clear, descriptive name (e.g., "Q4 Marketing Campaign")
- **Client** — Select an existing client or create a new one
- **Start Date** — When work begins
- **Budget** (optional) — Set a budget for tracking purposes

## Step 3: Configure Settings

You can customize your project with:

- **Tags** for easy filtering
- **Team members** to assign
- **Milestones** to track progress

## Step 4: Save and Start

Click **Create Project** and you're done! You'll be taken to your new project's overview page where you can start adding tasks, uploading files, and inviting collaborators.

> **Pro Tip:** Use project templates to speed up setup for recurring project types.

## Next Steps

- [Inviting team members](/help#inviting-team-members)
- [Understanding the dashboard](/help#understanding-the-dashboard)`,
  },
  {
    id: "inviting-team-members",
    category: "Getting Started",
    title: "Inviting team members",
    excerpt:
      "Add colleagues to your workspace and manage their roles and permissions effectively.",
    readTime: "4 min read",
    content: `# Inviting Team Members

Collaboration is at the heart of Unite-Hub. Here's how to bring your team on board.

## Sending Invitations

1. Go to **Settings → Team** in your workspace
2. Click **Invite Members**
3. Enter email addresses (comma-separated for multiple invites)
4. Choose a role for each invitee:
   - **Admin** — Full access to all settings and billing
   - **Manager** — Can manage projects, clients, and reports
   - **Member** — Can work on assigned tasks and view projects
   - **Viewer** — Read-only access to assigned projects
5. Click **Send Invitations**

## Managing Roles

You can change a team member's role at any time:

- Navigate to **Settings → Team**
- Click the role dropdown next to the member's name
- Select the new role

## Bulk Invitations

For larger teams, use the **CSV Import** feature:

1. Download the template from **Settings → Team → Import**
2. Fill in emails and roles
3. Upload the completed CSV
4. Review and confirm

> **Note:** Invited members will receive an email with a link to join your workspace. Invitations expire after 7 days.

## Removing Members

To remove someone from your workspace, click the **⋯** menu next to their name and select **Remove**. Their assigned tasks will be flagged for reassignment.`,
  },
  {
    id: "understanding-the-dashboard",
    category: "Getting Started",
    title: "Understanding the dashboard",
    excerpt:
      "A comprehensive overview of the main dashboard, its widgets, and how to customize your view.",
    readTime: "5 min read",
    content: `# Understanding the Dashboard

Your dashboard is your command center — a single view of everything that matters.

## Dashboard Overview

The main dashboard is divided into several key areas:

### Top Bar
- **Search** — Quick search across all projects, tasks, and clients
- **Notifications** — Alerts for mentions, deadlines, and updates
- **Profile** — Access your settings and account info

### Sidebar Navigation
- **Dashboard** — Return to this overview
- **Projects** — All your active and archived projects
- **Clients** — Client profiles and communication
- **Reports** — Analytics and insights
- **Settings** — Workspace configuration

## Dashboard Widgets

### Activity Feed
Shows recent actions across your workspace — new tasks, comments, file uploads, and status changes.

### Tasks Due Today
A prioritized list of tasks due today or overdue, sorted by urgency.

### Project Progress
Visual progress bars for your active projects, showing completion percentage.

### Quick Stats
Key metrics at a glance:
- Open tasks
- Overdue items
- Hours logged this week
- Revenue this month

## Customizing Your Dashboard

You can personalize your dashboard:

1. Click the **⚙ Customize** button in the top-right
2. Drag and drop widgets to rearrange
3. Toggle widgets on/off
4. Resize widgets by dragging corners
5. Click **Save Layout** to persist changes

> **Pro Tip:** Create multiple dashboard layouts for different contexts (e.g., "Daily Review" vs. "Weekly Planning").`,
  },

  // ─── Billing ─────────────────────────────────────────────────────────────
  {
    id: "how-billing-works",
    category: "Billing",
    title: "How billing works",
    excerpt:
      "Understand our billing model, invoice cycles, payment methods, and how charges are calculated.",
    readTime: "4 min read",
    content: `# How Billing Works

We believe in transparent, predictable billing. Here's everything you need to know.

## Billing Cycle

- **Monthly plans** are billed on the same date each month
- **Annual plans** are billed once per year with a 20% discount
- Your billing date is set when you first subscribe

## What You're Charged For

Your bill includes:

1. **Base plan fee** — The flat rate for your chosen tier
2. **Additional seats** — Per-seat charges beyond your plan's included seats
3. **Add-ons** — Any optional features you've enabled (e.g., advanced analytics)

## Payment Methods

We accept:
- Credit/debit cards (Visa, Mastercard, Amex)
- ACH bank transfers (US only)
- Wire transfer (Enterprise plans only)

All payments are processed securely through **Stripe**.

## Invoices

- Invoices are generated automatically on each billing date
- Access them anytime at **Settings → Billing → Invoice History**
- PDF invoices are emailed to the billing contact

## Proration

When upgrading mid-cycle:
- You're charged the prorated difference for the remaining days
- The new rate applies starting your next billing cycle

When downgrading:
- The change takes effect at the start of your next billing cycle
- You retain access to premium features until then

> **Need help?** Contact our billing team at billing@unite-hub.com`,
  },
  {
    id: "changing-your-plan",
    category: "Billing",
    title: "Changing your plan",
    excerpt:
      "Upgrade or downgrade between Starter, Professional, and Enterprise plans seamlessly.",
    readTime: "3 min read",
    content: `# Changing Your Plan

You can change your plan at any time from your billing settings.

## Upgrading Your Plan

1. Go to **Settings → Billing → Change Plan**
2. Select your new plan tier
3. Review the prorated charges
4. Confirm the upgrade

**What happens immediately:**
- New features become available instantly
- Additional seat allowances are applied
- You're charged the prorated difference

## Downgrading Your Plan

1. Go to **Settings → Billing → Change Plan**
2. Select a lower-tier plan
3. Review what features you'll lose
4. Confirm the downgrade

**Important notes about downgrades:**
- The change takes effect at your next billing date
- You keep current features until then
- Data exceeding the new plan's limits is preserved in read-only mode
- You have 30 days to adjust after the downgrade takes effect

## Comparing Plans

| Feature | Starter | Professional | Enterprise |
|---------|---------|-------------|------------|
| Users | 5 | 25 | Unlimited |
| Projects | 10 | Unlimited | Unlimited |
| Storage | 5 GB | 50 GB | Unlimited |
| API Access | ✗ | ✓ | ✓ |
| Priority Support | ✗ | ✗ | ✓ |

## Annual vs Monthly

Switch between monthly and annual billing to save 20%:

1. Go to **Settings → Billing**
2. Toggle **Annual Billing**
3. Your next invoice will reflect the annual rate`,
  },
  {
    id: "canceling-subscription",
    category: "Billing",
    title: "Canceling your subscription",
    excerpt:
      "How to cancel, what happens to your data, and how to reactivate if you change your mind.",
    readTime: "3 min read",
    content: `# Canceling Your Subscription

We're sorry to see you go. Here's how cancellation works.

## How to Cancel

1. Navigate to **Settings → Billing**
2. Click **Cancel Subscription** at the bottom of the page
3. Select a reason for leaving (optional but appreciated)
4. Confirm cancellation

## What Happens After Cancellation

- **Immediate:** Your subscription remains active until the end of the current billing period
- **During grace period:** You retain full access to all features
- **After expiry:** Your workspace switches to a read-only state
- **Data retention:** We keep your data for **90 days** after cancellation

## Data Export

Before canceling, we recommend exporting your data:

1. Go to **Settings → Data → Export**
2. Select what to export (projects, clients, tasks, files)
3. Choose format (CSV or JSON)
4. Click **Start Export**
5. You'll receive an email when the download is ready

## Reactivation

Changed your mind? Reactivating is simple:

- **Within 90 days:** Log in and click **Reactivate** — all your data is restored
- **After 90 days:** Data may be permanently deleted; contact support for options

## Refunds

- Monthly plans: No refunds for partial months
- Annual plans: Prorated refund within the first 30 days

> **Questions?** Reach out to support@unite-hub.com before canceling — we'd love to help solve any issues.`,
  },

  // ─── Account ─────────────────────────────────────────────────────────────
  {
    id: "updating-profile",
    category: "Account",
    title: "Updating your profile",
    excerpt:
      "Manage your personal information, notification preferences, and profile photo.",
    readTime: "2 min read",
    content: `# Updating Your Profile

Keep your profile up to date for the best experience.

## Accessing Profile Settings

1. Click your avatar in the top-right corner
2. Select **My Profile** from the dropdown

## What You Can Update

### Personal Information
- **Display Name** — How you appear to team members
- **Email Address** — Changing this requires verification
- **Time Zone** — Affects due dates and notifications
- **Language** — Interface language preference

### Profile Photo
- Click the camera icon on your avatar
- Upload a JPG or PNG (max 5 MB)
- Crop and adjust as needed
- Click **Save**

### Notification Preferences
Control what you get notified about:
- **Email notifications** — Daily digest or real-time
- **Push notifications** — Browser or mobile
- **Slack integration** — Route notifications to Slack channels
- **Quiet hours** — Pause notifications during off-hours

## Changing Your Email

1. Enter your new email address
2. Click **Update Email**
3. Check your new inbox for a verification link
4. Click the link within 24 hours

> **Note:** Your old email remains active until you verify the new one.`,
  },
  {
    id: "resetting-password",
    category: "Account",
    title: "Resetting your password",
    excerpt:
      "Step-by-step guide to resetting your password if you've forgotten it or want to change it.",
    readTime: "2 min read",
    content: `# Resetting Your Password

Whether you've forgotten your password or want to set a new one, here's what to do.

## If You're Logged In

1. Go to **Settings → Security**
2. Click **Change Password**
3. Enter your current password
4. Enter and confirm your new password
5. Click **Update Password**

## If You're Locked Out

1. Go to the login page
2. Click **Forgot Password?**
3. Enter the email address associated with your account
4. Check your inbox for a reset link
5. Click the link and set a new password
6. The link expires after **1 hour**

## Password Requirements

Your password must:
- Be at least **12 characters** long
- Include at least one **uppercase** letter
- Include at least one **lowercase** letter
- Include at least one **number**
- Include at least one **special character** (!@#$%^&*)

## Security Tips

- **Use a password manager** like 1Password or Bitwarden
- **Never reuse passwords** across different services
- **Enable two-factor authentication** for extra security
- **Don't share** your password with anyone, including team members

> **Still having trouble?** Contact support@unite-hub.com with your registered email address.`,
  },
  {
    id: "enabling-2fa",
    category: "Account",
    title: "Enabling two-factor authentication",
    excerpt:
      "Add an extra layer of security to your account with TOTP-based two-factor authentication.",
    readTime: "3 min read",
    content: `# Enabling Two-Factor Authentication

Two-factor authentication (2FA) adds a critical security layer to your account.

## What is 2FA?

With 2FA enabled, logging in requires:
1. Your password (something you know)
2. A time-based code from your authenticator app (something you have)

## Setup Steps

### Step 1: Choose an Authenticator App
We recommend:
- **1Password** (built-in TOTP)
- **Authy** (cross-platform, cloud backup)
- **Google Authenticator** (simple, phone-only)

### Step 2: Enable 2FA
1. Go to **Settings → Security → Two-Factor Authentication**
2. Click **Enable 2FA**
3. Scan the QR code with your authenticator app
4. Enter the 6-digit code shown in your app
5. Click **Verify and Enable**

### Step 3: Save Your Backup Codes
After enabling, you'll see **10 one-time backup codes**:
- Save these in a secure location (password manager recommended)
- Each code can be used once if you lose access to your authenticator
- Generate new codes anytime from Security settings

## Disabling 2FA

1. Go to **Settings → Security → Two-Factor Authentication**
2. Click **Disable 2FA**
3. Enter your password to confirm

## Troubleshooting

**Code not working?**
- Ensure your device's time is synchronized
- Try the next code that appears in your app
- Use a backup code if needed

**Lost your phone?**
- Use a backup code to log in
- Then disable and re-enable 2FA with a new device

> **Security note:** We strongly recommend keeping 2FA enabled at all times.`,
  },

  // ─── API ─────────────────────────────────────────────────────────────────
  {
    id: "getting-api-key",
    category: "API",
    title: "Getting your API key",
    excerpt:
      "Generate and manage API keys for integrating Unite-Hub with your existing tools and workflows.",
    readTime: "3 min read",
    content: `# Getting Your API Key

Unite-Hub's REST API lets you integrate with your favorite tools and automate workflows.

## Prerequisites

- **Professional plan or higher** (API access is not available on Starter)
- Admin or Manager role in your workspace

## Generating an API Key

1. Navigate to **Settings → API → API Keys**
2. Click **Generate New Key**
3. Enter a descriptive name (e.g., "Zapier Integration")
4. Select permissions:
   - **Read** — View projects, tasks, clients
   - **Write** — Create and update records
   - **Admin** — Full access including deletion
5. Click **Generate**
6. **Copy the key immediately** — it won't be shown again

## Using Your API Key

Include the key in your request headers:

\`\`\`bash
curl -H "Authorization: Bearer <YOUR_API_KEY>" https://api.unite-hub.com/v1/projects
\`\`\`

## Key Management Best Practices

- **One key per integration** — Makes revocation easier
- **Least privilege** — Grant only the permissions needed
- **Rotate regularly** — Generate new keys every 90 days
- **Never commit keys to code** — Use environment variables
- **Monitor usage** — Check the API dashboard for unusual activity

## Rate Limits

| Plan | Requests/min | Requests/day |
|------|-------------|-------------|
| Professional | 60 | 10,000 |
| Enterprise | 300 | 100,000 |

## API Documentation

Full API reference is available at [api.unite-hub.com/docs](https://api.unite-hub.com/docs)`,
  },
  {
    id: "webhook-setup",
    category: "API",
    title: "Webhook setup guide",
    excerpt:
      "Configure webhooks to receive real-time notifications when events occur in your workspace.",
    readTime: "4 min read",
    content: `# Webhook Setup Guide

Webhooks let you receive real-time HTTP notifications when events happen in Unite-Hub.

## What Are Webhooks?

Instead of polling our API for changes, webhooks push data to your endpoint when events occur. For example:
- New task created
- Project status changed
- Client updated
- Invoice paid

## Setting Up a Webhook

### Step 1: Create an Endpoint
Your server needs an HTTP POST endpoint that:
- Accepts JSON payloads
- Returns a 200 status within 5 seconds
- Handles duplicate deliveries gracefully

### Step 2: Configure in Unite-Hub
1. Go to **Settings → API → Webhooks**
2. Click **Add Webhook**
3. Enter your endpoint URL
4. Select events to subscribe to
5. Click **Create Webhook**

## Payload Format

All webhook payloads include:

\`\`\`json
{
  "id": "evt_abc123",
  "event": "task.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "task_xyz",
    "title": "Review proposal",
    "project_id": "proj_456",
    "assignee_id": "user_789"
  }
}
\`\`\`

## Verifying Signatures

Every webhook request includes a signature header for verification:

\`\`\`javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
\`\`\`

## Retry Policy

Failed deliveries are retried:
- **1st retry:** 1 minute after failure
- **2nd retry:** 5 minutes after failure
- **3rd retry:** 30 minutes after failure
- **4th retry:** 2 hours after failure
- After 4 failed attempts, the webhook is disabled

## Testing

Use the **Send Test Event** button in the webhook settings to verify your endpoint is working correctly.`,
  },

  // ─── Troubleshooting ─────────────────────────────────────────────────────
  {
    id: "common-login-issues",
    category: "Troubleshooting",
    title: "Common login issues",
    excerpt:
      "Solutions for the most frequent login problems including SSO errors, session timeouts, and account lockouts.",
    readTime: "3 min read",
    content: `# Common Login Issues

Having trouble logging in? Here are solutions for the most common problems.

## "Invalid credentials" error

**Likely causes:**
- Typo in email or password
- Caps Lock is enabled
- Using an old password after a recent change

**Solution:**
1. Double-check your email spelling
2. Ensure Caps Lock is off
3. Try the **Forgot Password** flow if needed

## SSO/SAML Login Failure

**Error: "SAML response invalid"**
- Your session with the identity provider may have expired
- Try logging out of your IdP and back in, then retry

**Error: "User not found in workspace"**
- Your SSO email must match your Unite-Hub account email
- Contact your workspace admin to verify your email

## Session Keeps Expiring

If you're being logged out frequently:
1. **Check browser cookies** — Ensure cookies are enabled for unite-hub.com
2. **Disable aggressive privacy extensions** — Some ad blockers clear session cookies
3. **Clear browser cache** — Old cached data can cause conflicts
4. **Try an incognito window** — To rule out extension conflicts

## Account Locked

After 5 failed login attempts, your account locks for 15 minutes.

**To unlock:**
- Wait 15 minutes and try again
- Or click **Forgot Password** to reset immediately

## Two-Factor Code Not Working

1. Make sure your device's clock is synced (important for TOTP)
2. Try the code that appears *after* the current one
3. Use one of your backup codes
4. If all else fails, contact support with your registered email

## Browser Compatibility

Unite-Hub supports:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

> **Still stuck?** Email support@unite-hub.com with your browser version and any error messages.`,
  },
  {
    id: "sync-failures",
    category: "Troubleshooting",
    title: "What to do if a sync fails",
    excerpt:
      "Troubleshoot failed syncs with third-party integrations like Google Calendar, Slack, and QuickBooks.",
    readTime: "4 min read",
    content: `# What to Do If a Sync Fails

Syncs keep your data consistent across Unite-Hub and your connected tools. Here's how to fix them when they break.

## Identifying Sync Issues

Check the sync status:
1. Go to **Settings → Integrations**
2. Look for a red warning icon next to any integration
3. Click it to see the last error message

## Common Causes and Fixes

### 1. Expired Authorization

**Symptom:** "OAuth token expired" or "Authorization required"

**Fix:**
1. Click **Reconnect** next to the integration
2. Re-authorize the connection
3. The sync should resume automatically

### 2. Rate Limiting

**Symptom:** "Rate limit exceeded" or "Too many requests"

**Fix:**
- This usually resolves within a few minutes
- Reduce sync frequency in integration settings
- Contact support if it persists for more than an hour

### 3. Data Conflicts

**Symptom:** "Conflict detected" or "Record modified externally"

**Fix:**
1. Review the conflict details
2. Choose which version to keep (Unite-Hub or external)
3. Optionally set a default conflict resolution rule

### 4. Missing Required Fields

**Symptom:** "Validation error" or "Required field missing"

**Fix:**
1. Check the field mapping in integration settings
2. Ensure all required fields are mapped
3. Re-trigger the sync

## Manual Sync

You can force a manual sync at any time:
1. Go to **Settings → Integrations**
2. Click the **⋯** menu next to the integration
3. Select **Sync Now**

## Sync Logs

Review detailed sync history:
1. Go to **Settings → Integrations → Sync Logs**
2. Filter by integration, status, or date range
3. Click any entry for full details

## Preventive Measures

- **Keep integrations connected** — Don't disconnect and reconnect unnecessarily
- **Map fields carefully** — Incorrect mappings cause most sync errors
- **Monitor sync health** — Check the integrations page weekly
- **Set up alerts** — Get notified when a sync fails

> **Persistent issues?** Our integration support team can help — email integrations@unite-hub.com with your workspace ID and integration name.`,
  },
];
