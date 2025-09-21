// Google Drive Backup Service
import { googleAuth } from './googleAuth';
import { useScheduleStore } from '../stores/useScheduleStore';

interface BackupMetadata {
  id?: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size: number;
}

interface AppBackupData {
  version: string;
  timestamp: string;
  tasks: any[];
  courses: any[];
  settings: any;
  timeBlocks: any[];
  preferences: any;
}

class GoogleDriveBackupService {
  private readonly APP_FOLDER_NAME = 'StudentLife Backups';
  private readonly BACKUP_FILE_NAME = 'studentlife-backup.json';
  private folderId: string | null = null;

  /**
   * Initialize the backup service
   */
  async initialize(): Promise<void> {
    if (!googleAuth.isSignedIn()) {
      throw new Error('User must be signed in to use backup service');
    }

    // Find or create app folder
    this.folderId = await this.findOrCreateAppFolder();
  }

  /**
   * Find or create the app folder in Google Drive
   */
  private async findOrCreateAppFolder(): Promise<string> {
    const token = googleAuth.getAccessToken();
    if (!token) throw new Error('No access token available');

    // Search for existing folder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${this.APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!searchResponse.ok) {
      throw new Error('Failed to search for app folder');
    }

    const searchData = await searchResponse.json();
    
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Create new folder
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: this.APP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create app folder');
    }

    const createData = await createResponse.json();
    return createData.id;
  }

  /**
   * Create a backup of current app data
   */
  async createBackup(): Promise<BackupMetadata> {
    await googleAuth.refreshTokenIfNeeded();
    const token = googleAuth.getAccessToken();
    if (!token) throw new Error('No access token available');

    if (!this.folderId) {
      await this.initialize();
    }

    // Get current app state
    const state = useScheduleStore.getState();
    const backupData: AppBackupData = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      tasks: state.tasks,
      courses: state.courses,
      settings: state.settings,
      timeBlocks: state.timeBlocks,
      preferences: state.preferences
    };

    const backupJson = JSON.stringify(backupData, null, 2);
    const blob = new Blob([backupJson], { type: 'application/json' });

    // Check if backup file exists
    const existingFile = await this.findBackupFile();

    let response;
    if (existingFile) {
      // Update existing file
      response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: blob
        }
      );
    } else {
      // Create new file
      const metadata = {
        name: this.BACKUP_FILE_NAME,
        parents: [this.folderId],
        mimeType: 'application/json',
        description: 'StudentLife app backup - automatically synced'
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: form
        }
      );
    }

    if (!response.ok) {
      throw new Error('Failed to create backup');
    }

    const fileData = await response.json();
    
    // Also create a timestamped backup for history
    await this.createTimestampedBackup(backupJson);

    return {
      id: fileData.id,
      name: fileData.name,
      createdTime: fileData.createdTime,
      modifiedTime: fileData.modifiedTime,
      size: blob.size
    };
  }

  /**
   * Create a timestamped backup for history
   */
  private async createTimestampedBackup(backupJson: string): Promise<void> {
    const token = googleAuth.getAccessToken();
    if (!token) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const metadata = {
      name: `studentlife-backup-${timestamp}.json`,
      parents: [this.folderId],
      mimeType: 'application/json',
      description: 'StudentLife app backup - point in time snapshot'
    };

    const blob = new Blob([backupJson], { type: 'application/json' });
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: form
      }
    );
  }

  /**
   * Find the main backup file
   */
  private async findBackupFile(): Promise<{ id: string } | null> {
    const token = googleAuth.getAccessToken();
    if (!token) throw new Error('No access token available');

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${this.BACKUP_FILE_NAME}' and '${this.folderId}' in parents and trashed=false`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  }

  /**
   * Restore from backup
   */
  async restoreBackup(): Promise<void> {
    await googleAuth.refreshTokenIfNeeded();
    const token = googleAuth.getAccessToken();
    if (!token) throw new Error('No access token available');

    const backupFile = await this.findBackupFile();
    if (!backupFile) {
      throw new Error('No backup found');
    }

    // Download the backup file
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${backupFile.id}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to download backup');
    }

    const backupData: AppBackupData = await response.json();

    // Validate backup data
    if (!backupData.version || !backupData.timestamp) {
      throw new Error('Invalid backup format');
    }

    // Restore to store
    const store = useScheduleStore.getState();
    store.restoreFromBackup({
      tasks: backupData.tasks || [],
      courses: backupData.courses || [],
      settings: backupData.settings || {},
      timeBlocks: backupData.timeBlocks || [],
      preferences: backupData.preferences || {}
    });

    console.log('Backup restored successfully from', backupData.timestamp);
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupMetadata[]> {
    await googleAuth.refreshTokenIfNeeded();
    const token = googleAuth.getAccessToken();
    if (!token) throw new Error('No access token available');

    if (!this.folderId) {
      await this.initialize();
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${this.folderId}' in parents and trashed=false&orderBy=modifiedTime desc&fields=files(id,name,createdTime,modifiedTime,size)`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to list backups');
    }

    const data = await response.json();
    return data.files || [];
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(fileId: string): Promise<void> {
    await googleAuth.refreshTokenIfNeeded();
    const token = googleAuth.getAccessToken();
    if (!token) throw new Error('No access token available');

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete backup');
    }
  }

  /**
   * Enable auto-backup
   */
  enableAutoBackup(intervalMinutes: number = 30): void {
    // Clear any existing interval
    this.disableAutoBackup();

    // Set up new interval
    const intervalId = setInterval(async () => {
      try {
        if (googleAuth.isSignedIn()) {
          await this.createBackup();
          console.log('Auto-backup completed at', new Date().toISOString());
        }
      } catch (error) {
        console.error('Auto-backup failed:', error);
      }
    }, intervalMinutes * 60 * 1000);

    // Store interval ID
    (window as any).__autoBackupInterval = intervalId;
  }

  /**
   * Disable auto-backup
   */
  disableAutoBackup(): void {
    if ((window as any).__autoBackupInterval) {
      clearInterval((window as any).__autoBackupInterval);
      delete (window as any).__autoBackupInterval;
    }
  }

  /**
   * Get last backup time
   */
  async getLastBackupTime(): Promise<Date | null> {
    const backups = await this.listBackups();
    if (backups.length > 0) {
      return new Date(backups[0].modifiedTime);
    }
    return null;
  }
}

// Create singleton instance
export const driveBackup = new GoogleDriveBackupService();