// Google OAuth2 Authentication Service
import { useScheduleStore } from '../stores/useScheduleStore';

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface GoogleAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
}

class GoogleAuthService {
  private clientId: string;
  private redirectUri: string;
  private scope: string;
  private tokenClient: any;
  private accessToken: string | null = null;
  private user: GoogleUser | null = null;

  constructor() {
    // These will be set from environment variables
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    this.redirectUri = import.meta.env.VITE_REDIRECT_URI || window.location.origin;
    this.scope = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
    
    // Load saved token from localStorage
    this.loadSavedSession();
  }

  /**
   * Initialize Google Identity Services
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.clientId) {
        reject(new Error('Google Client ID not configured'));
        return;
      }

      // Load the Google Identity Services library
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Initialize the token client
        this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: this.scope,
          callback: (response: any) => {
            this.handleAuthResponse(response);
          },
        });
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.body.appendChild(script);
    });
  }

  /**
   * Start the OAuth2 flow
   */
  async signIn(): Promise<GoogleUser> {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('Google Auth not initialized'));
        return;
      }

      // Store resolve/reject for use in callback
      this.authResolve = resolve;
      this.authReject = reject;

      // Request access token
      this.tokenClient.requestAccessToken();
    });
  }

  private authResolve: ((user: GoogleUser) => void) | null = null;
  private authReject: ((error: Error) => void) | null = null;

  /**
   * Handle OAuth2 response
   */
  private async handleAuthResponse(response: any) {
    if (response.error) {
      console.error('Auth error:', response.error);
      if (this.authReject) {
        this.authReject(new Error(response.error));
      }
      return;
    }

    this.accessToken = response.access_token;
    
    // Save token to localStorage
    localStorage.setItem('google_access_token', this.accessToken);
    localStorage.setItem('google_token_expiry', String(Date.now() + (response.expires_in * 1000)));

    // Fetch user info
    try {
      const userInfo = await this.fetchUserInfo();
      this.user = userInfo;
      localStorage.setItem('google_user', JSON.stringify(userInfo));
      
      if (this.authResolve) {
        this.authResolve(userInfo);
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      if (this.authReject) {
        this.authReject(error as Error);
      }
    }
  }

  /**
   * Fetch user information
   */
  private async fetchUserInfo(): Promise<GoogleUser> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture
    };
  }

  /**
   * Sign out
   */
  signOut(): void {
    this.accessToken = null;
    this.user = null;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
    localStorage.removeItem('google_user');
    
    // Revoke the token
    if (this.accessToken) {
      (window as any).google.accounts.oauth2.revoke(this.accessToken);
    }
  }

  /**
   * Check if user is signed in
   */
  isSignedIn(): boolean {
    if (!this.accessToken) return false;
    
    const expiry = localStorage.getItem('google_token_expiry');
    if (expiry && Date.now() > parseInt(expiry)) {
      this.signOut();
      return false;
    }
    
    return true;
  }

  /**
   * Get current user
   */
  getCurrentUser(): GoogleUser | null {
    return this.user;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Load saved session from localStorage
   */
  private loadSavedSession(): void {
    const token = localStorage.getItem('google_access_token');
    const expiry = localStorage.getItem('google_token_expiry');
    const userStr = localStorage.getItem('google_user');

    if (token && expiry && Date.now() < parseInt(expiry)) {
      this.accessToken = token;
      if (userStr) {
        try {
          this.user = JSON.parse(userStr);
        } catch (e) {
          console.error('Failed to parse saved user:', e);
        }
      }
    } else {
      // Clear expired session
      this.signOut();
    }
  }

  /**
   * Refresh token if needed
   */
  async refreshTokenIfNeeded(): Promise<void> {
    const expiry = localStorage.getItem('google_token_expiry');
    if (expiry && Date.now() > parseInt(expiry) - 60000) { // Refresh 1 minute before expiry
      return new Promise((resolve, reject) => {
        this.authResolve = () => resolve();
        this.authReject = reject;
        this.tokenClient.requestAccessToken();
      });
    }
  }
}

// Create singleton instance
export const googleAuth = new GoogleAuthService();