// Improved Google OAuth2 Authentication Service with better error handling
import { useScheduleStore } from '../stores/useScheduleStore';

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface AuthState {
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
}

class ImprovedGoogleAuthService {
  private clientId: string;
  private scope: string;
  private tokenClient: any;
  private accessToken: string | null = null;
  private user: GoogleUser | null = null;
  private authState: AuthState = {
    isConnecting: false,
    isConnected: false,
    error: null
  };
  private authCallbacks: {
    resolve?: (user: GoogleUser) => void;
    reject?: (error: Error) => void;
  } = {};

  constructor() {
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    this.scope = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
    
    // Load saved session
    this.loadSavedSession();
  }

  /**
   * Initialize Google Identity Services with better error handling
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already initialized
      if (this.tokenClient) {
        resolve();
        return;
      }

      if (!this.clientId) {
        const error = new Error('Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in your environment.');
        console.error(error);
        this.authState.error = error.message;
        reject(error);
        return;
      }

      // Check if script already loaded
      if ((window as any).google?.accounts?.oauth2) {
        this.initializeTokenClient();
        resolve();
        return;
      }

      // Load the Google Identity Services library
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      const timeout = setTimeout(() => {
        script.remove();
        const error = new Error('Timeout loading Google Identity Services');
        this.authState.error = error.message;
        reject(error);
      }, 10000); // 10 second timeout

      script.onload = () => {
        clearTimeout(timeout);
        try {
          this.initializeTokenClient();
          resolve();
        } catch (error) {
          console.error('Failed to initialize token client:', error);
          this.authState.error = 'Failed to initialize Google authentication';
          reject(error);
        }
      };

      script.onerror = () => {
        clearTimeout(timeout);
        script.remove();
        const error = new Error('Failed to load Google Identity Services. Check your internet connection.');
        this.authState.error = error.message;
        reject(error);
      };

      document.body.appendChild(script);
    });
  }

  /**
   * Initialize the token client
   */
  private initializeTokenClient(): void {
    if (!(window as any).google?.accounts?.oauth2) {
      throw new Error('Google Identity Services not loaded');
    }

    this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: this.scope,
      callback: this.handleAuthResponse.bind(this),
      error_callback: this.handleAuthError.bind(this),
    });
  }

  /**
   * Start the OAuth2 flow with better state management
   */
  async signIn(): Promise<GoogleUser> {
    // Clear previous errors
    this.authState.error = null;
    this.authState.isConnecting = true;

    // Ensure initialization
    if (!this.tokenClient) {
      try {
        await this.initialize();
      } catch (error) {
        this.authState.isConnecting = false;
        throw error;
      }
    }

    return new Promise((resolve, reject) => {
      // Store callbacks
      this.authCallbacks = { resolve, reject };

      try {
        // Request access token with additional hints
        this.tokenClient.requestAccessToken({
          prompt: '', // Use empty string to avoid re-consent if possible
          hint: this.user?.email, // Hint with previous email if available
        });
      } catch (error) {
        this.authState.isConnecting = false;
        this.authState.error = 'Failed to open authentication window';
        reject(error);
      }
    });
  }

  /**
   * Handle OAuth2 response
   */
  private async handleAuthResponse(response: any): Promise<void> {
    console.log('Auth response received:', response);

    if (response.error) {
      this.handleAuthError(response);
      return;
    }

    try {
      this.accessToken = response.access_token;
      
      // Save token
      localStorage.setItem('google_access_token', this.accessToken);
      localStorage.setItem('google_token_expiry', String(Date.now() + (response.expires_in * 1000)));

      // Fetch user info
      const userInfo = await this.fetchUserInfo();
      this.user = userInfo;
      localStorage.setItem('google_user', JSON.stringify(userInfo));
      
      // Update state
      this.authState.isConnected = true;
      this.authState.isConnecting = false;
      this.authState.error = null;

      // Resolve promise
      if (this.authCallbacks.resolve) {
        this.authCallbacks.resolve(userInfo);
      }
    } catch (error) {
      console.error('Failed to complete authentication:', error);
      this.authState.isConnecting = false;
      this.authState.error = 'Failed to complete authentication';
      
      if (this.authCallbacks.reject) {
        this.authCallbacks.reject(error as Error);
      }
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any): void {
    console.error('Auth error:', error);
    
    let errorMessage = 'Authentication failed';
    
    if (error.type === 'popup_closed') {
      errorMessage = 'Authentication window was closed';
    } else if (error.type === 'popup_blocked') {
      errorMessage = 'Pop-up blocked. Please allow pop-ups for this site.';
    } else if (error.error === 'access_denied') {
      errorMessage = 'Access denied. Please grant the required permissions.';
    } else if (error.error_description) {
      errorMessage = error.error_description;
    }

    this.authState.isConnecting = false;
    this.authState.error = errorMessage;

    if (this.authCallbacks.reject) {
      this.authCallbacks.reject(new Error(errorMessage));
    }
  }

  /**
   * Fetch user information with retry logic
   */
  private async fetchUserInfo(retries = 3): Promise<GoogleUser> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });

        if (response.status === 401) {
          // Token expired or invalid
          this.signOut();
          throw new Error('Authentication expired. Please sign in again.');
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch user info: ${response.statusText}`);
        }

        const data = await response.json();
        return {
          id: data.id,
          email: data.email,
          name: data.name,
          picture: data.picture
        };
      } catch (error) {
        if (i === retries - 1) throw error;
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    throw new Error('Failed to fetch user info after retries');
  }

  /**
   * Sign out with cleanup
   */
  signOut(): void {
    // Revoke token if available
    if (this.accessToken && (window as any).google?.accounts?.oauth2) {
      try {
        (window as any).google.accounts.oauth2.revoke(this.accessToken);
      } catch (error) {
        console.error('Failed to revoke token:', error);
      }
    }

    // Clear state
    this.accessToken = null;
    this.user = null;
    this.authState = {
      isConnecting: false,
      isConnected: false,
      error: null
    };

    // Clear storage
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
    localStorage.removeItem('google_user');
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
    if (!this.isSignedIn()) return null;
    return this.accessToken;
  }

  /**
   * Get authentication state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Load saved session from localStorage
   */
  private loadSavedSession(): void {
    try {
      const token = localStorage.getItem('google_access_token');
      const expiry = localStorage.getItem('google_token_expiry');
      const userStr = localStorage.getItem('google_user');

      if (token && expiry && Date.now() < parseInt(expiry)) {
        this.accessToken = token;
        if (userStr) {
          this.user = JSON.parse(userStr);
          this.authState.isConnected = true;
        }
      } else {
        // Clear expired session
        this.signOut();
      }
    } catch (error) {
      console.error('Failed to load saved session:', error);
      this.signOut();
    }
  }

  /**
   * Refresh token if needed
   */
  async refreshTokenIfNeeded(): Promise<void> {
    const expiry = localStorage.getItem('google_token_expiry');
    if (!expiry) return;

    const expiryTime = parseInt(expiry);
    const now = Date.now();
    
    // Refresh if token expires in less than 5 minutes
    if (now > expiryTime - 300000) {
      try {
        await this.signIn();
      } catch (error) {
        console.error('Failed to refresh token:', error);
        throw error;
      }
    }
  }

  /**
   * Test connection to Google Drive
   */
  async testConnection(): Promise<boolean> {
    if (!this.accessToken) return false;

    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to test connection:', error);
      return false;
    }
  }
}

// Create singleton instance
export const improvedGoogleAuth = new ImprovedGoogleAuthService();