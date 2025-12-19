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
    return result.data;
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
  },

  /**
   * Open login window
   * Opens Anthropic authorization page in a new window
   */
  async openLoginWindow(): Promise<void> {
    const { authUrl } = await this.startLogin();
    // Open in a new window for better UX
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    window.open(
      authUrl,
      'claude-oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );
  },

  /**
   * Poll for login completion
   * After opening login window, poll until user completes auth
   */
  async waitForLogin(maxAttempts = 60, intervalMs = 2000): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      const status = await this.getStatus();
      if (status.isLoggedIn) {
        return true;
      }
    }
    return false;
  }
};
