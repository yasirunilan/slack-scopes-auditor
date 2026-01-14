// Slack Scopes Auditor - Web UI
// Uses the backend server which leverages @slack-scopes-auditor/core

const SLACK_APP_MANIFEST = {
  _metadata: { major_version: 1, minor_version: 1 },
  display_information: {
    name: 'Scopes Auditor',
    description: 'Audit Slack app scopes and integration logs',
    background_color: '#1a1a2e',
    long_description:
      'An open-source tool for auditing Slack app scopes using the team.integrationLogs API. This app helps IT admins and organization admins verify what scopes have been granted to Slack apps in their workspace. It requires admin privileges to access integration logs and is only available on paid Slack plans.',
  },
  oauth_config: {
    scopes: { user: ['admin'] },
  },
  settings: {
    org_deploy_enabled: false,
    socket_mode_enabled: false,
    token_rotation_enabled: false,
  },
};

// Store data globally for tab switching
let currentData = null;
let availableApps = [];
let selectedApps = new Set();

// Scope descriptions - maps scope names to human-readable descriptions
const SCOPE_DESCRIPTIONS = {
  // Admin scopes
  admin: 'Administer a workspace',
  'admin.analytics:read': 'Access analytics data about the workspace',
  'admin.apps:read': 'View apps and app requests in a workspace',
  'admin.apps:write': 'Manage apps and app requests in a workspace',
  'admin.barriers:read': 'Read information barriers in the organization',
  'admin.barriers:write': 'Manage information barriers in the organization',
  'admin.conversations:read': 'View conversations in the workspace',
  'admin.conversations:write': 'Manage conversations in the workspace',
  'admin.invites:read': 'View workspace invitations',
  'admin.invites:write': 'Manage workspace invitations',
  'admin.teams:read': 'View team information',
  'admin.teams:write': 'Manage team settings',
  'admin.usergroups:read': 'View user groups in the workspace',
  'admin.usergroups:write': 'Manage user groups in the workspace',
  'admin.users:read': 'View users in the workspace',
  'admin.users:write': 'Manage users in the workspace',
  'admin.workflows:read': 'View workflows in the workspace',
  'admin.workflows:write': 'Manage workflows in the workspace',

  // App mentions
  'app_mentions:read': 'View messages that mention the app',

  // Bookmarks
  'bookmarks:read': 'View bookmarks in channels',
  'bookmarks:write': 'Add, edit, and remove bookmarks',

  // Channels scopes
  'channels:history': 'View messages and content in public channels',
  'channels:join': 'Join public channels in a workspace',
  'channels:manage': 'Manage public channels and create new ones',
  'channels:read': 'View basic information about public channels',
  'channels:write': 'Manage a user\'s public channels',
  'channels:write.invites': 'Invite members to public channels',
  'channels:write.topic': 'Set the description of public channels',

  // Chat scopes
  'chat:write': 'Send messages as the app',
  'chat:write:bot': 'Send messages as the app bot user',
  'chat:write:user': 'Send messages on behalf of the user',
  'chat:write.customize': 'Send messages with custom username and avatar',
  'chat:write.public': 'Send messages to channels the app isn\'t a member of',

  // Commands
  commands: 'Add shortcuts and slash commands',

  // Connections
  'connections:write': 'Generate websocket URIs and connect to Slack',

  // Conversations
  'conversations.connect:manage': 'Manage Slack Connect channels',
  'conversations.connect:read': 'View Slack Connect channel information',
  'conversations.connect:write': 'Create Slack Connect invitations',

  // DND (Do Not Disturb)
  'dnd:read': 'View Do Not Disturb settings',
  'dnd:write': 'Modify Do Not Disturb settings',

  // Emoji
  'emoji:read': 'View custom emoji in a workspace',

  // Files scopes
  'files:read': 'View files shared in channels and conversations',
  'files:write': 'Upload, edit, and delete files',
  'files:write:user': 'Upload, edit, and delete files as the user',

  // Groups (private channels)
  'groups:history': 'View messages in private channels the app has been added to',
  'groups:read': 'View basic information about private channels',
  'groups:write': 'Manage private channels and create new ones',
  'groups:write.invites': 'Invite members to private channels',
  'groups:write.topic': 'Set the description of private channels',

  // Identity
  identify: 'View information about the user\'s identity',
  'identity.avatar': 'View the user\'s profile picture',
  'identity.basic': 'View basic information about the user',
  'identity.email': 'View the user\'s email address',
  'identity.team': 'View the user\'s workspace name',

  // IM (Direct Messages)
  'im:history': 'View messages in direct messages the app has been added to',
  'im:read': 'View basic information about direct messages',
  'im:write': 'Start direct messages with people',

  // Incoming webhooks
  'incoming-webhook': 'Post messages to specific channels',

  // Links
  'links:read': 'View URLs in messages',
  'links:write': 'Unfurl URLs in messages',
  'links.embed:write': 'Embed content previews in messages',

  // Metadata
  'metadata.message:read': 'View message metadata',

  // MPIM (Multi-person Direct Messages / Group DMs)
  'mpim:history': 'View messages in group direct messages',
  'mpim:read': 'View basic information about group direct messages',
  'mpim:write': 'Start group direct messages with people',

  // OpenID Connect
  openid: 'Sign in with Slack using OpenID Connect',

  // Pins
  'pins:read': 'View pinned content in channels',
  'pins:write': 'Pin and unpin messages and files',

  // Reactions
  'reactions:read': 'View emoji reactions in channels and conversations',
  'reactions:write': 'Add and remove emoji reactions',

  // Reminders
  'reminders:read': 'View reminders created by the app',
  'reminders:write': 'Create and manage reminders',
  'reminders:write:user': 'Create and manage reminders for the user',

  // Remote files
  'remote_files:read': 'View remote files added by the app',
  'remote_files:share': 'Share remote files on behalf of users',
  'remote_files:write': 'Add, edit, and delete remote files',

  // Search
  'search:read': 'Search messages, files, and other content',

  // Stars
  'stars:read': 'View starred messages and files',
  'stars:write': 'Star and unstar messages and files',

  // Team scopes
  'team.billing:read': 'View billing information',
  'team.preferences:read': 'View workspace preferences',
  'team:read': 'View basic workspace information',

  // Tokens
  'tokens.basic': 'Execute methods with the user\'s token',

  // Triggers
  'triggers:read': 'View workflow triggers',
  'triggers:write': 'Create and manage workflow triggers',

  // User groups
  'usergroups:read': 'View user groups in a workspace',
  'usergroups:write': 'Create and manage user groups',

  // Users scopes
  'users.profile:read': 'View profile information about users',
  'users.profile:write': 'Edit the user\'s profile information',
  'users:read': 'View users and their basic information',
  'users:read.email': 'View email addresses of users',
  'users:write': 'Set presence for the user',

  // Workflows
  'workflow.steps:execute': 'Execute workflow steps from the app',

  // Bot
  bot: 'Add the app as a bot user',

  // Client
  client: 'Receive all events from a workspace in real-time',

  // Post
  post: 'Post messages to the workspace',
};

// Get scope description or return a default message
function getScopeDescription(scope) {
  return SCOPE_DESCRIPTIONS[scope] || 'No description available';
}

// Get Slack docs URL for a scope
function getScopeDocsUrl(scope) {
  return `https://api.slack.com/scopes/${scope}`;
}

// Render a scope with tooltip and link
function renderScopeWithTooltip(scope) {
  const description = getScopeDescription(scope);
  const docsUrl = getScopeDocsUrl(scope);
  return `<a href="${docsUrl}" target="_blank" class="scope-link" title="${escapeHtml(description)}">
    <span class="scope-code">${escapeHtml(scope)}</span>
    <span class="scope-tooltip">${escapeHtml(description)}</span>
  </a>`;
}

// Render a scope tag (for tables) with tooltip
function renderScopeTag(scope) {
  const description = getScopeDescription(scope);
  const docsUrl = getScopeDocsUrl(scope);
  return `<a href="${docsUrl}" target="_blank" class="scope-tag-link" title="${escapeHtml(description)}">
    <span class="scope-tag">${escapeHtml(scope)}</span>
  </a>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('manifestCode').textContent = JSON.stringify(
    SLACK_APP_MANIFEST,
    null,
    2
  );

  // Set up tab switching
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
});

function switchTab(tabName) {
  // Update button states
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update content visibility
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });
}

function showManifestInfo() {
  document.getElementById('manifestInfo').classList.remove('hidden');
}

function hideManifestInfo() {
  document.getElementById('manifestInfo').classList.add('hidden');
}

function copyManifest() {
  navigator.clipboard
    .writeText(JSON.stringify(SLACK_APP_MANIFEST, null, 2))
    .then(() => alert('Manifest copied to clipboard!'))
    .catch(() => alert('Failed to copy. Please copy manually.'));
}

async function runAudit() {
  const token = document.getElementById('token').value.trim();
  const appId = document.getElementById('appId').value.trim();
  const resultsSection = document.getElementById('results');
  const errorSection = document.getElementById('error');
  const scopesContainer = document.getElementById('scopesContainer');

  // Validate inputs
  if (!token) {
    showError('Please enter your Slack token');
    return;
  }
  if (!appId) {
    showError('Please enter an App ID to audit');
    return;
  }

  // Hide previous results/errors and comparison sections
  resultsSection.classList.add('hidden');
  errorSection.classList.add('hidden');
  document.getElementById('compareResults').classList.add('hidden');
  document.getElementById('compareModal').classList.add('hidden');

  // Show loading
  scopesContainer.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Fetching integration logs...</p>
    </div>
  `;
  resultsSection.classList.remove('hidden');

  try {
    // Call backend API which uses @slack-scopes-auditor/core
    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, appId }),
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.message || getErrorMessage(result.error));
    }

    // Store for tab switching
    currentData = result.data;

    // Display all views using data from core package
    displayResults(currentData.currentScopes, currentData.categorized);
    displayTimeline(currentData.timeline);
    displayUserPermissions(currentData.userScopes);

    // Switch to scopes tab
    switchTab('scopes');
  } catch (error) {
    resultsSection.classList.add('hidden');
    showError(error.message);
  }
}

function displayResults(currentScopes, categorized) {
  const container = document.getElementById('scopesContainer');

  if (categorized.categories.length === 0) {
    container.innerHTML = '<p>No active scopes found for this app.</p>';
    return;
  }

  let html = '';

  for (const category of categorized.categories) {
    html += `
      <div class="scope-category">
        <h4>${escapeHtml(category.name)} (${category.scopes.length})</h4>
        <ul class="scope-list">
          ${category.scopes.map((s) => {
            const description = getScopeDescription(s);
            const docsUrl = getScopeDocsUrl(s);
            return `<li>
              <a href="${docsUrl}" target="_blank" class="scope-item-link">
                <span class="scope-item-name">${escapeHtml(s)}</span>
                <span class="scope-item-separator">—</span>
                <span class="scope-item-description">${escapeHtml(description)}</span>
              </a>
            </li>`;
          }).join('')}
        </ul>
      </div>
    `;
  }

  html += `
    <div class="summary">
      <p><strong>Total:</strong> ${categorized.total} active scopes</p>
      ${currentScopes.lastActivity ? `<p><strong>Last activity:</strong> ${new Date(currentScopes.lastActivity).toLocaleString()}</p>` : ''}
    </div>
  `;

  container.innerHTML = html;
}

function displayTimeline(timeline) {
  const container = document.getElementById('timelineContainer');

  if (timeline.length === 0) {
    container.innerHTML = '<p>No events found.</p>';
    return;
  }

  let html = `
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>User</th>
            <th>Action</th>
            <th>Scopes</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (const event of timeline) {
    const date = new Date(event.timestamp);

    html += `
      <tr>
        <td>${date.toLocaleString()}</td>
        <td>${escapeHtml(event.userName)}</td>
        <td>
          <span class="badge badge-${event.changeType}">${event.changeType}</span>
        </td>
        <td class="scopes-cell">
          ${event.scopes.length > 0 ? event.scopes.map((s) => renderScopeTag(s)).join('') : '-'}
        </td>
      </tr>
    `;
  }

  html += `
        </tbody>
      </table>
    </div>
    <div class="summary">
      <p><strong>Total events:</strong> ${timeline.length}</p>
    </div>
  `;

  container.innerHTML = html;
}

function displayUserPermissions(userScopes) {
  const container = document.getElementById('usersContainer');

  if (userScopes.length === 0) {
    container.innerHTML = '<p>No user activity found.</p>';
    return;
  }

  let html = '';

  for (const user of userScopes) {
    html += `
      <div class="user-card">
        <div class="user-card-header">
          <h4>${escapeHtml(user.userName)}</h4>
          <div class="user-stats">
            <span class="stat-granted">+${user.totalScopesGranted} granted</span>
            <span class="stat-revoked">-${user.totalScopesRevoked} revoked</span>
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Action</th>
              <th>Scopes</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Sort actions by date descending
    const sortedActions = [...user.actions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    for (const action of sortedActions) {
      html += `
        <tr>
          <td>${new Date(action.timestamp).toLocaleString()}</td>
          <td>
            <span class="badge badge-${action.changeType}">${action.changeType}</span>
          </td>
          <td class="scopes-cell">
            ${action.scopes.length > 0 ? action.scopes.map((s) => renderScopeTag(s)).join('') : '-'}
          </td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  html += `
    <div class="summary">
      <p><strong>Total users:</strong> ${userScopes.length}</p>
    </div>
  `;

  container.innerHTML = html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  const errorSection = document.getElementById('error');
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = message;
  errorSection.classList.remove('hidden');
}

function getErrorMessage(errorCode) {
  const messages = {
    invalid_auth: 'Invalid authentication token. Please check your token.',
    not_admin: 'You must be an admin to access this API.',
    paid_only: 'This API is only available on paid Slack plans.',
    not_allowed_token_type:
      'Token type not permitted. Use a user token with admin scope.',
    missing_scope:
      'Token is missing required scope. Ensure you have the "admin" scope.',
    account_inactive: 'Account is inactive or has been deactivated.',
    token_revoked: 'Token has been revoked.',
  };

  return messages[errorCode] || `Slack API error: ${errorCode}`;
}

// CSV Export Functions
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCSV(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function downloadTimelineCSV() {
  if (!currentData || !currentData.timeline || currentData.timeline.length === 0) {
    alert('No timeline data to export');
    return;
  }

  const headers = ['Date', 'Time', 'User', 'Action', 'Scopes'];
  const rows = currentData.timeline.map((event) => {
    const date = new Date(event.timestamp);
    return [
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      event.userName,
      event.changeType,
      event.scopes.join(', '),
    ].map(escapeCSV).join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const appId = document.getElementById('appId').value.trim() || 'app';
  downloadCSV(`timeline-${appId}-${new Date().toISOString().split('T')[0]}.csv`, csvContent);
}

function downloadUserPermissionsCSV() {
  if (!currentData || !currentData.userScopes || currentData.userScopes.length === 0) {
    alert('No user permissions data to export');
    return;
  }

  const headers = ['User', 'Total Granted', 'Total Revoked', 'Date', 'Time', 'Action', 'Scopes'];
  const rows = [];

  for (const user of currentData.userScopes) {
    for (const action of user.actions) {
      const date = new Date(action.timestamp);
      rows.push([
        user.userName,
        user.totalScopesGranted,
        user.totalScopesRevoked,
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        action.changeType,
        action.scopes.join(', '),
      ].map(escapeCSV).join(','));
    }
  }

  const csvContent = [headers.join(','), ...rows].join('\n');
  const appId = document.getElementById('appId').value.trim() || 'app';
  downloadCSV(`user-permissions-${appId}-${new Date().toISOString().split('T')[0]}.csv`, csvContent);
}

// Compare Apps Functions
async function showCompareModal() {
  const token = document.getElementById('token').value.trim();

  if (!token) {
    showError('Please enter your Slack token first');
    return;
  }

  const modal = document.getElementById('compareModal');
  const container = document.getElementById('appListContainer');
  const errorSection = document.getElementById('error');

  errorSection.classList.add('hidden');
  document.getElementById('results').classList.add('hidden');
  document.getElementById('compareResults').classList.add('hidden');
  modal.classList.remove('hidden');

  // Show loading
  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading apps from your workspace...</p>
    </div>
  `;

  try {
    const response = await fetch('/api/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.message || getErrorMessage(result.error));
    }

    availableApps = result.apps;
    selectedApps = new Set();
    displayAppList();
  } catch (error) {
    modal.classList.add('hidden');
    showError(error.message);
  }
}

function hideCompareModal() {
  document.getElementById('compareModal').classList.add('hidden');
}

function displayAppList() {
  const container = document.getElementById('appListContainer');

  if (availableApps.length === 0) {
    container.innerHTML = '<p>No apps found in your workspace.</p>';
    return;
  }

  let html = `
    <div class="app-list">
      <p class="app-list-header">Found ${availableApps.length} apps. Select 2-5 to compare:</p>
      <div class="app-checkboxes">
  `;

  for (const app of availableApps) {
    const lastActivity = app.lastActivity ? new Date(app.lastActivity).toLocaleDateString() : 'Unknown';
    const checked = selectedApps.has(app.appId) ? 'checked' : '';
    const appName = app.appName || 'Unknown App';

    html += `
      <label class="app-checkbox">
        <input type="checkbox" value="${app.appId}" ${checked} onchange="toggleAppSelection('${app.appId}')">
        <span class="app-info">
          <span class="app-name">${escapeHtml(appName)}</span>
          <span class="app-id-small">${escapeHtml(app.appId)}</span>
          <span class="app-meta">${app.scopeCount} scopes • Last active: ${lastActivity}</span>
        </span>
      </label>
    `;
  }

  html += `
      </div>
      <p class="selection-count">Selected: <strong>${selectedApps.size}</strong> / 5</p>
    </div>
  `;

  container.innerHTML = html;
}

function toggleAppSelection(appId) {
  if (selectedApps.has(appId)) {
    selectedApps.delete(appId);
  } else if (selectedApps.size < 5) {
    selectedApps.add(appId);
  } else {
    // Revert checkbox if already at max
    const checkbox = document.querySelector(`input[value="${appId}"]`);
    if (checkbox) checkbox.checked = false;
    alert('You can select up to 5 apps');
    return;
  }

  // Update selection count
  const countEl = document.querySelector('.selection-count strong');
  if (countEl) countEl.textContent = selectedApps.size;
}

async function runComparison() {
  if (selectedApps.size < 2) {
    alert('Please select at least 2 apps to compare');
    return;
  }

  const token = document.getElementById('token').value.trim();
  const modal = document.getElementById('compareModal');
  const resultsSection = document.getElementById('compareResults');
  const container = document.getElementById('compareContainer');

  // Show loading in results
  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Comparing apps...</p>
    </div>
  `;

  modal.classList.add('hidden');
  document.getElementById('results').classList.add('hidden');
  resultsSection.classList.remove('hidden');

  try {
    const response = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, appIds: Array.from(selectedApps) }),
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.message || getErrorMessage(result.error));
    }

    displayComparisonResults(result.data);
  } catch (error) {
    resultsSection.classList.add('hidden');
    showError(error.message);
  }
}

function displayComparisonResults(data) {
  const container = document.getElementById('compareContainer');

  if (data.scopes.length === 0) {
    container.innerHTML = '<p>No scopes found for the selected apps.</p>';
    return;
  }

  // Build comparison table
  let html = `
    <div class="compare-table-container">
      <table class="compare-table">
        <thead>
          <tr>
            <th class="scope-column">Scope</th>
            ${data.apps.map((app) => `<th class="app-column">${escapeHtml(app.appName || 'Unknown')}<br><small class="app-id-header">${escapeHtml(app.appId)}</small><br><small>${app.scopes.length} scopes</small></th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `;

  for (const row of data.comparison) {
    const description = getScopeDescription(row.scope);
    const docsUrl = getScopeDocsUrl(row.scope);
    html += `
      <tr>
        <td class="scope-name">
          <a href="${docsUrl}" target="_blank" class="scope-name-link" title="${escapeHtml(description)}">
            ${escapeHtml(row.scope)}
            <span class="scope-description">${escapeHtml(description)}</span>
          </a>
        </td>
        ${row.apps.map((app) => `<td class="scope-check ${app.hasScope ? 'has-scope' : 'no-scope'}">${app.hasScope ? '✓' : '−'}</td>`).join('')}
      </tr>
    `;
  }

  html += `
        </tbody>
      </table>
    </div>
    <div class="summary">
      <p><strong>Total unique scopes:</strong> ${data.scopes.length}</p>
      <p><strong>Apps compared:</strong> ${data.apps.length}</p>
    </div>
  `;

  container.innerHTML = html;
}

function hideCompareResults() {
  document.getElementById('compareResults').classList.add('hidden');
}
