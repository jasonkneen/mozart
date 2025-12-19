/**
 * OAuth authentication handlers for Mozart
 * Based on @anthropic-ai/anthropic-oauth package
 */

import { homedir } from 'node:os';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { generatePKCE } from '@openauthjs/openauth/pkce';

// ==========================================
// OAuth Configuration (matching anthropic-oauth)
// ==========================================

const DEFAULT_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const AUTHORIZATION_ENDPOINT_CONSOLE = 'https://console.anthropic.com/oauth/authorize';
const TOKEN_ENDPOINT = 'https://console.anthropic.com/v1/oauth/token';
const REDIRECT_URI = 'https://console.anthropic.com/oauth/code/callback';
// Note: org:create_api_key scope requires special permissions not available to most users
// We request user:inference to try Bearer auth directly (though not yet supported by Anthropic API)
const SCOPES = 'user:profile user:inference';

// ==========================================
// Storage
// ==========================================

function getEncryptionKey() {
  const machineId = process.env.HOSTNAME || process.env.COMPUTERNAME || 'default-machine';
  return createHash('sha256').update(machineId + 'cluso-oauth').digest();
}

function getOAuthDir() {
  return join(process.env.HOME || homedir(), '.cluso');
}

function getOAuthConfigPath() {
  return join(getOAuthDir(), 'oauth-config.json');
}

function encryptData(data) {
  const iv = randomBytes(16);
  const key = getEncryptionKey();
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptData(encryptedData) {
  const parts = encryptedData.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const key = getEncryptionKey();
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

async function readOAuthConfig() {
  try {
    const configPath = getOAuthConfigPath();
    const content = await fs.readFile(configPath, 'utf-8');
    const data = JSON.parse(content);
    return {
      accessToken: decryptData(data.accessToken),
      refreshToken: decryptData(data.refreshToken),
      apiKey: data.apiKey ? decryptData(data.apiKey) : null,
      expiresAt: data.expiresAt,
      mode: data.mode
    };
  } catch {
    return null;
  }
}

async function writeOAuthConfig(config) {
  const configDir = getOAuthDir();
  try {
    await fs.mkdir(configDir, { recursive: true });
  } catch {
    // Directory may already exist
  }
  const encrypted = {
    accessToken: encryptData(config.accessToken),
    refreshToken: encryptData(config.refreshToken),
    apiKey: config.apiKey ? encryptData(config.apiKey) : null,
    expiresAt: config.expiresAt,
    mode: config.mode
  };
  await fs.writeFile(getOAuthConfigPath(), JSON.stringify(encrypted, null, 2), 'utf-8');
}

// ==========================================
// PKCE & State (matching anthropic-oauth)
// ==========================================

function generateState() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// ==========================================
// OAuth Flow Functions
// ==========================================

export async function startLogin() {
  try {
    const pkce = await generatePKCE();
    const state = generateState();

    const params = new URLSearchParams({
      code: 'true',
      client_id: DEFAULT_CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256',
      state: state
    });

    return {
      success: true,
      data: {
        authUrl: `${AUTHORIZATION_ENDPOINT_CONSOLE}?${params.toString()}`,
        verifier: pkce.verifier,
        state
      }
    };
  } catch (err) {
    return { success: false, error: `Failed to start login: ${err.message}` };
  }
}

export async function completeLogin(code, verifier, expectedState) {
  try {
    // The code might contain the state appended with #
    const [authCode, callbackState] = code.split('#');

    // Validate state for CSRF protection
    if (callbackState && callbackState !== expectedState) {
      return {
        success: false,
        error: 'State mismatch: The callback state does not match the expected state.'
      };
    }

    if (!authCode?.trim()) {
      return { success: false, error: 'Invalid authorization code: code is empty' };
    }

    const body = {
      code: authCode,
      grant_type: 'authorization_code',
      client_id: DEFAULT_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier
    };

    // Only include state if present
    if (callbackState) {
      body.state = callbackState;
    }

    console.log('Token exchange request:', JSON.stringify(body, null, 2));

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange error:', errorText);
      return {
        success: false,
        error: `Token exchange failed (${response.status}): ${errorText}`
      };
    }

    const tokenData = await response.json();

    if (!tokenData.access_token) {
      return { success: false, error: 'No access token in response' };
    }

    const expiresAt = Date.now() + tokenData.expires_in * 1000;

    // Note: API key creation requires org:create_api_key scope which is not available to most users.
    // We store the access token and will try Bearer auth (user:inference scope) for API calls.
    // If that fails, users need to set ANTHROPIC_API_KEY environment variable.

    await writeOAuthConfig({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || '',
      apiKey: '', // Not available without org:create_api_key scope
      expiresAt,
      mode: 'console'
    });

    return {
      success: true,
      data: {
        accessToken: tokenData.access_token,
        expiresIn: tokenData.expires_in
      }
    };
  } catch (err) {
    console.error('Complete login error:', err);
    return { success: false, error: `Failed to complete login: ${err.message}` };
  }
}

async function refreshAccessToken() {
  try {
    const config = await readOAuthConfig();

    if (!config || !config.refreshToken) {
      return { success: false, error: 'No refresh token available' };
    }

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: config.refreshToken,
        client_id: DEFAULT_CLIENT_ID
      })
    });

    if (!response.ok) {
      return { success: false, error: 'Token refresh failed' };
    }

    const tokenData = await response.json();
    const expiresAt = Date.now() + tokenData.expires_in * 1000;

    await writeOAuthConfig({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || config.refreshToken,
      expiresAt,
      mode: config.mode
    });

    return {
      success: true,
      data: {
        accessToken: tokenData.access_token,
        expiresIn: tokenData.expires_in
      }
    };
  } catch (err) {
    return { success: false, error: `Failed to refresh token: ${err.message}` };
  }
}

export async function getAccessToken() {
  try {
    const config = await readOAuthConfig();

    if (!config) {
      return { success: false, error: 'Not logged in' };
    }

    const now = Date.now();
    const timeUntilExpiry = config.expiresAt - now;
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes

    if (timeUntilExpiry < refreshThreshold) {
      const refreshResult = await refreshAccessToken();

      if (!refreshResult.success) {
        return { success: false, error: refreshResult.error };
      }

      const newConfig = await readOAuthConfig();
      if (!newConfig) {
        return { success: false, error: 'Failed to read refreshed config' };
      }

      return {
        success: true,
        data: {
          accessToken: newConfig.accessToken,
          apiKey: newConfig.apiKey,
          expiresIn: Math.floor((newConfig.expiresAt - now) / 1000),
          mode: newConfig.mode
        }
      };
    }

    return {
      success: true,
      data: {
        accessToken: config.accessToken,
        apiKey: config.apiKey,
        expiresIn: Math.floor(timeUntilExpiry / 1000),
        mode: config.mode
      }
    };
  } catch (err) {
    return { success: false, error: `Failed to get access token: ${err.message}` };
  }
}

export async function getStatus() {
  try {
    const config = await readOAuthConfig();

    if (!config) {
      return {
        success: true,
        data: {
          isLoggedIn: false,
          mode: null,
          expiresAt: null,
          expiresIn: null
        }
      };
    }

    const now = Date.now();
    const expiresIn = Math.max(0, Math.floor((config.expiresAt - now) / 1000));
    const isExpired = expiresIn <= 0;

    return {
      success: true,
      data: {
        isLoggedIn: !isExpired,
        mode: config.mode,
        expiresAt: new Date(config.expiresAt).toISOString(),
        expiresIn: isExpired ? 0 : expiresIn
      }
    };
  } catch (err) {
    return { success: false, error: `Failed to get status: ${err.message}` };
  }
}

export async function logout() {
  try {
    const configPath = getOAuthConfigPath();
    try {
      await fs.unlink(configPath);
    } catch {
      // File may not exist
    }
    return { success: true, data: 'Logged out successfully' };
  } catch (err) {
    return { success: false, error: `Failed to logout: ${err.message}` };
  }
}
