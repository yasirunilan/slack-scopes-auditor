import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SlackClient,
  computeCurrentScopes,
  computeAllAppScopes,
  categorizeScopes,
  transformToTimeline,
  transformToUserScopes,
} from '@slack-scopes-auditor/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

async function parseJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}

async function handleAudit(req, res) {
  try {
    const { token, appId } = await parseJsonBody(req);

    if (!token || !appId) {
      sendJson(res, 400, { ok: false, error: 'Missing token or appId' });
      return;
    }

    const client = new SlackClient({ token });
    const logs = await client.getAllIntegrationLogs({ app_id: appId });

    // Use core package transformers
    const currentScopes = computeCurrentScopes(logs, appId);
    const categorized = categorizeScopes(currentScopes.activeScopes);
    const timeline = transformToTimeline(logs);
    const userScopes = transformToUserScopes(logs);

    sendJson(res, 200, {
      ok: true,
      data: {
        currentScopes,
        categorized,
        timeline,
        userScopes,
        logs,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const code = error.code || 'unknown_error';
    sendJson(res, 400, { ok: false, error: code, message });
  }
}

async function handleListApps(req, res) {
  try {
    const { token } = await parseJsonBody(req);

    if (!token) {
      sendJson(res, 400, { ok: false, error: 'Missing token' });
      return;
    }

    const client = new SlackClient({ token });
    // Fetch all logs (no app_id filter)
    const logs = await client.getAllIntegrationLogs({});

    // Get all unique apps with their scopes
    const allAppScopes = computeAllAppScopes(logs);

    // Convert to array format with app info
    const apps = [];
    for (const [appId, scopeData] of allAppScopes) {
      // Find app name from logs (app_type contains the app name)
      const appLog = logs.find((log) => log.app_id === appId || log.service_id === appId);
      apps.push({
        appId,
        appName: appLog?.app_type || appLog?.service_type || 'Unknown App',
        scopeCount: scopeData.activeScopes.length,
        lastActivity: scopeData.lastActivity,
      });
    }

    // Sort by scope count descending
    apps.sort((a, b) => b.scopeCount - a.scopeCount);

    sendJson(res, 200, { ok: true, apps });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const code = error.code || 'unknown_error';
    sendJson(res, 400, { ok: false, error: code, message });
  }
}

async function handleCompareApps(req, res) {
  try {
    const { token, appIds } = await parseJsonBody(req);

    if (!token) {
      sendJson(res, 400, { ok: false, error: 'Missing token' });
      return;
    }

    if (!appIds || !Array.isArray(appIds) || appIds.length < 2) {
      sendJson(res, 400, { ok: false, error: 'Please select at least 2 apps to compare' });
      return;
    }

    if (appIds.length > 5) {
      sendJson(res, 400, { ok: false, error: 'Maximum 5 apps can be compared at once' });
      return;
    }

    const client = new SlackClient({ token });
    // Fetch all logs to get complete picture
    const logs = await client.getAllIntegrationLogs({});

    // Compute scopes for selected apps
    const appData = [];
    const allScopes = new Set();

    for (const appId of appIds) {
      const scopeResult = computeCurrentScopes(logs, appId);
      const appLog = logs.find((log) => log.app_id === appId || log.service_id === appId);

      appData.push({
        appId,
        appName: appLog?.app_type || appLog?.service_type || 'Unknown App',
        scopes: scopeResult.activeScopes,
        lastActivity: scopeResult.lastActivity,
      });

      // Collect all unique scopes
      for (const scope of scopeResult.activeScopes) {
        allScopes.add(scope);
      }
    }

    // Build comparison matrix
    const scopeList = Array.from(allScopes).sort();
    const comparison = scopeList.map((scope) => ({
      scope,
      apps: appData.map((app) => ({
        appId: app.appId,
        hasScope: app.scopes.includes(scope),
      })),
    }));

    sendJson(res, 200, {
      ok: true,
      data: {
        apps: appData,
        scopes: scopeList,
        comparison,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const code = error.code || 'unknown_error';
    sendJson(res, 400, { ok: false, error: code, message });
  }
}

function serveStaticFile(req, res) {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // API endpoint - uses core package
  if (req.url === '/api/audit' && req.method === 'POST') {
    handleAudit(req, res);
    return;
  }

  // List all apps endpoint
  if (req.url === '/api/apps' && req.method === 'POST') {
    handleListApps(req, res);
    return;
  }

  // Compare apps endpoint
  if (req.url === '/api/compare' && req.method === 'POST') {
    handleCompareApps(req, res);
    return;
  }

  // Serve static files
  if (req.method === 'GET') {
    serveStaticFile(req, res);
    return;
  }

  res.writeHead(405);
  res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`Web UI server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});
