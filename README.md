# Slack Scopes Auditor

An open-source tool for auditing Slack app scopes using the `team.integrationLogs` API. Helps IT admins and organization admins verify what scopes Slack apps have been granted in their workspace.

## Why Use This?

When you install a Slack app in your workspace, you grant it certain permissions (scopes). This tool helps you:

- **Verify scopes**: See exactly what permissions an app currently has
- **Track changes**: View the history of when scopes were added, removed, or changed
- **Audit by user**: See which admin granted which permissions and when
- **Transparency**: If you're a Slack app developer, share this with your users so they can verify your app's permissions

## Features

- **Current Scopes View**: See all active scopes for any Slack app, organized by category
- **Timeline View**: Chronological history of all scope changes
- **User Permissions View**: See which users granted what permissions
- **CLI & Web UI**: Use via command line or simple web interface
- **JSON Output**: Export data for further analysis

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18 or higher** - [Download here](https://nodejs.org/) (or use Docker)
- **A paid Slack workspace** - The `team.integrationLogs` API is only available on paid Slack plans (Pro, Business+, or Enterprise Grid)
- **Workspace admin privileges** - You must be a workspace admin to access integration logs

## Quick Start (Docker)

The easiest way to run this tool is with Docker - no Node.js installation required.

### 1. Create a Slack App

Follow steps 2-4 in the [Manual Installation](#quick-start-manual) section below to create a Slack app and get your token.

### 2. Run with Docker

```bash
# Clone the repository
git clone https://github.com/olivahealth/slack-scopes-auditor.git
cd slack-scopes-auditor

# Set your token
export SLACK_TOKEN=xoxp-your-token-here

# Audit an app's scopes
docker compose run --rm cli audit --app-id A1234567890

# View timeline
docker compose run --rm cli timeline --app-id A1234567890

# View raw logs
docker compose run --rm cli logs --app-id A1234567890

# Show help
docker compose run --rm cli --help
```

### Run the Web UI with Docker

```bash
# Start the web server on port 3000
docker compose up web

# Or use a different port (e.g., 8080)
PORT=8080 docker compose up web

# Open http://localhost:3000 (or your custom port) in your browser
```

### One-liner (without docker-compose)

```bash
# Build and run directly
docker build -t slack-scopes-auditor .
docker run --rm -e SLACK_TOKEN=xoxp-your-token slack-scopes-auditor audit --app-id A1234567890
```

## Quick Start (Manual)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/olivahealth/slack-scopes-auditor.git
cd slack-scopes-auditor

# Enable Corepack (comes with Node.js 18+, enables pnpm)
corepack enable

# Install dependencies
pnpm install

# Build the project
pnpm build
```

### 2. Create a Slack App for Auditing

You need to create a simple Slack app that has permission to read integration logs.

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Select **"From an app manifest"**
4. Choose your workspace from the dropdown
5. Delete any existing content and paste this manifest:

```json
{
  "_metadata": {
    "major_version": 1,
    "minor_version": 1
  },
  "display_information": {
    "name": "Scopes Auditor",
    "description": "Audit Slack app scopes and integration logs",
    "background_color": "#1a1a2e",
    "long_description": "An open-source tool for auditing Slack app scopes using the team.integrationLogs API. This app helps IT admins and organization admins verify what scopes have been granted to Slack apps in their workspace. It requires admin privileges to access integration logs and is only available on paid Slack plans."
  },
  "oauth_config": {
    "scopes": {
      "user": ["admin"]
    }
  },
  "settings": {
    "org_deploy_enabled": false,
    "socket_mode_enabled": false,
    "token_rotation_enabled": false
  }
}
```

6. Click **"Next"**, then **"Create"**

### 3. Install the App and Get Your Token

1. In your new app's settings, go to **"Install App"** in the left sidebar
2. Click **"Install to Workspace"**
3. Review the permissions and click **"Allow"**
4. Copy the **"User OAuth Token"** (it starts with `xoxp-`)

### 4. Find the App ID You Want to Audit

To audit a Slack app, you need its App ID. You can find it by:

- Going to [api.slack.com/apps](https://api.slack.com/apps) and clicking on the app
- The App ID is shown in the "App Credentials" section (looks like `A1234567890`)
- Or check the URL when viewing the app: `https://api.slack.com/apps/A1234567890`

### 5. Run the Auditor

```bash
# Set your token as an environment variable
export SLACK_TOKEN=xoxp-your-token-here

# Audit an app's current scopes
pnpm --filter @slack-scopes-auditor/cli dev audit --app-id A1234567890

# View timeline of scope changes
pnpm --filter @slack-scopes-auditor/cli dev timeline --app-id A1234567890

# View raw integration logs
pnpm --filter @slack-scopes-auditor/cli dev logs --app-id A1234567890
```

## CLI Commands

### Audit Current Scopes

Shows the current active scopes for an app, organized by category:

```bash
pnpm --filter @slack-scopes-auditor/cli dev audit --app-id A1234567890
```

**Example output:**
```
Current Scopes for App: A1234567890
────────────────────────────────────────────────────────────

Channels (3)
  • channels:history
  • channels:join
  • channels:read

Users (2)
  • users:read
  • users:read.email

Chat (1)
  • chat:write

────────────────────────────────────────────────────────────
Total: 6 active scopes
Last activity: 2024-01-15T10:30:00.000Z
```

### View Timeline

Shows a chronological view of all scope changes:

```bash
pnpm --filter @slack-scopes-auditor/cli dev timeline --app-id A1234567890
```

**Example output:**
```
1/9/2026
  7:46:55 PM ^ expanded   john.doe - A1234567890
              Scopes: channels:read, chat:write, users:read
  7:46:55 PM + added      john.doe - A1234567890
              Scopes: identify, im:history, mpim:history

12/30/2025
  2:45:05 PM ^ expanded   jane.smith - A1234567890
              Scopes: files:read
```

### View Raw Logs

Shows the raw integration logs from Slack:

```bash
# All logs for an app
pnpm --filter @slack-scopes-auditor/cli dev logs --app-id A1234567890

# Filter by change type (added, removed, enabled, disabled, expanded, updated)
pnpm --filter @slack-scopes-auditor/cli dev logs --app-id A1234567890 --change-type added

# Fetch all pages of results
pnpm --filter @slack-scopes-auditor/cli dev logs --app-id A1234567890 --all
```

### JSON Output

All commands support JSON output for scripting or further analysis:

```bash
pnpm --filter @slack-scopes-auditor/cli dev audit --app-id A1234567890 --output json
```

### Show Manifest

Display the Slack app manifest with setup instructions:

```bash
pnpm --filter @slack-scopes-auditor/cli dev manifest
```

## Web UI

For non-technical users, a simple web interface is included:

```bash
# From the project root
pnpm run web
```

Then open [http://localhost:3001](http://localhost:3001) in your browser.

The web UI provides:
- **Current Scopes** tab: Categorized view of active scopes
- **Event Timeline** tab: Table of all scope changes with dates
- **User Permissions** tab: Breakdown of actions by each user

The web server uses the same `@slack-scopes-auditor/core` package as the CLI, ensuring consistent behavior.

## Configuration Options

### Environment Variables

```bash
export SLACK_TOKEN=xoxp-your-token-here      # Required: Your Slack user token
export SLACK_TEAM_ID=T1234567890             # Optional: For org-level tokens
export SLACK_SCOPES_OUTPUT=json              # Optional: Default output format
```

### Config File

Create a `.slack-scopesrc.json` file in your project or home directory:

```json
{
  "token": "xoxp-your-token-here",
  "defaultOutput": "table",
  "defaultAppId": "A1234567890"
}
```

### CLI Flags

```bash
--token, -t     Slack user token (overrides env/config)
--output, -o    Output format: table or json
--team-id       Team ID (for Enterprise Grid org-level tokens)
```

## Troubleshooting

### "paid_only" error

The `team.integrationLogs` API is only available on paid Slack plans (Pro, Business+, Enterprise Grid). Free workspaces cannot use this tool.

### "not_admin" error

You must be a workspace admin to access integration logs. Contact your workspace admin to get the necessary permissions.

### "invalid_auth" error

Your token is invalid or expired. Make sure you:
1. Copied the **User OAuth Token** (starts with `xoxp-`), not the Bot Token
2. The token hasn't been revoked
3. The app is still installed in your workspace

### "missing_scope" error

Your auditor app doesn't have the `admin` scope. Recreate the app using the manifest provided above.

### No logs returned

If `logs` or `timeline` returns empty results:
- The app ID might be incorrect
- The app might not have been installed yet (no activity to show)
- Try without the `--app-id` filter to see all workspace activity

## Project Structure

```
slack-scopes-auditor/
├── packages/
│   ├── core/           # Shared business logic (API client, transformers)
│   ├── cli/            # Command-line interface
│   └── web/            # Simple HTML/JS web interface
├── assets/
│   └── slack-app-manifest.json
├── package.json        # Workspace root
├── pnpm-workspace.yaml
└── README.md
```

## How It Works

1. **Fetch Logs**: The tool calls Slack's `team.integrationLogs` API to get the history of app installations and scope changes
2. **Process History**: It processes logs chronologically to compute the current state of scopes (handling adds, removes, expansions)
3. **Categorize**: Scopes are grouped by type (channels, users, chat, files, etc.)
4. **Display**: Results are shown in a user-friendly format (table or JSON)

The `admin` scope is required because `team.integrationLogs` returns sensitive information about all app integrations in a workspace.

## Security Notes

- **Tokens are not stored**: Your Slack token is only used to make API calls and is not persisted
- **Web UI is local**: The web server runs locally and all Slack API calls are made server-side - your token never leaves your machine
- **Keep tokens secure**: Don't commit tokens to git or share them publicly

## License

CC0 1.0 Universal - This work is dedicated to the public domain.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Credits

Built by [Oliva Health](https://olivahealth.app) to help our users verify the scopes we request when they add our Slack app to their workspaces.
