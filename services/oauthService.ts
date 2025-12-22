/**
 * OAuth Service - Manages Claude authentication flow
 */

const API_BASE = (import.meta as { env?: Record<string, string> }).env?.VITE_CONDUCTOR_API_BASE || '/api';

type OAuthStatus = {
  isLoggedIn: boolean;
  mode: 'console' | null;
  expiresAt: string | null;
  expiresIn: number | null;
};

type StartLoginResponse = {
  authUrl: string;
  verifier: string;
  state: string;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Store pending OAuth flow for completing login in-app
let pendingFlow: { verifier: string; state: string } | null = null;

export const oauthService = {
  /**
   * Get current OAuth status
   */
  async getStatus(): Promise<OAuthStatus> {
    const response = await fetch(`${API_BASE}/oauth/status`);
    if (!response.ok) {
      throw new Error('Failed to get OAuth status');
    }
    const result: ApiResponse<OAuthStatus> = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get OAuth status');
    }
    return result.data;
  },

  /**
   * Start OAuth login flow
   * Returns the authorization URL to redirect the user to
   */
  async startLogin(): Promise<StartLoginResponse> {
    const response = await fetch(`${API_BASE}/oauth/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to start login');
    }
    const result: ApiResponse<StartLoginResponse> = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to start login');
    }
    // Store the pending flow for later completion
    pendingFlow = {
      verifier: result.data.verifier,
      state: result.data.state
    };
    return result.data;
  },

  /**
   * Complete OAuth login with the authorization code
   * Call this after user authorizes and you have the code
   */
  async completeLogin(code: string): Promise<void> {
    if (!pendingFlow) {
      throw new Error('No pending OAuth flow. Call startLogin first.');
    }
    const response = await fetch(`${API_BASE}/oauth/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        verifier: pendingFlow.verifier,
        state: pendingFlow.state
      })
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to complete login');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to complete login');
    }
    // Clear pending flow on success
    pendingFlow = null;
  },

  /**
   * Clear any pending OAuth flow
   */
  clearPendingFlow(): void {
    pendingFlow = null;
  },

  /**
   * Logout and clear stored tokens
   */
  async logout(): Promise<void> {
    const response = await fetch(`${API_BASE}/oauth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to logout');
    }
  }
};

// Utility for opening OAuth popup windows
export const OAUTH_WINDOW_OPTIONS = {
  width: 600,
  height: 700,
  features: 'toolbar=no,menubar=no,scrollbars=yes,resizable=yes'
};

export function openOAuthWindow(url: string): Window | null {
  const { width, height, features } = OAUTH_WINDOW_OPTIONS;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  return window.open(
    url,
    'claude-oauth',
    `width=${width},height=${height},left=${left},top=${top},${features}`
  );
}
