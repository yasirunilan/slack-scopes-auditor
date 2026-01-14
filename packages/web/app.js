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

  // Hide previous results/errors
  resultsSection.classList.add('hidden');
  errorSection.classList.add('hidden');

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
          ${category.scopes.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
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
          ${event.scopes.length > 0 ? event.scopes.map((s) => `<span class="scope-tag">${escapeHtml(s)}</span>`).join('') : '-'}
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
            ${action.scopes.length > 0 ? action.scopes.map((s) => `<span class="scope-tag">${escapeHtml(s)}</span>`).join('') : '-'}
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
