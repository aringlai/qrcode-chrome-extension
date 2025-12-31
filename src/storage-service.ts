/**
 * StorageService - Chrome Extension Storage API Integration
 * 
 * Provides abstraction layer for Chrome storage operations with error handling
 * and data serialization for the QR Code Generator extension.
 * 
 * Requirements:
 * - 6.1: Store favorites in Chrome's local storage immediately
 * - 6.2: Retrieve saved History_Entry items from local storage
 * - 6.3: Handle storage errors gracefully and inform the user
 */

import { ExtensionStorage, createDefaultStorage, isExtensionStorage } from './types';

/**
 * Error types for storage operations
 */
export class StorageError extends Error {
  constructor(message: string, public readonly operation: string, public readonly cause?: Error) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Storage service that abstracts Chrome storage API interactions
 * Handles data serialization, error management, and capacity limits
 */
export class StorageService {
  private static readonly STORAGE_KEY = 'qr_generator_data';
  private static readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB Chrome storage limit

  /**
   * Save data to Chrome local storage
   * 
   * @param key Storage key
   * @param data Data to store
   * @throws StorageError if save operation fails
   * 
   * Requirements: 6.1 - Store favorites immediately
   */
  async save(key: string, data: any): Promise<void> {
    try {
      // Validate storage size before saving
      const serializedData = JSON.stringify(data);
      if (serializedData.length > StorageService.MAX_STORAGE_SIZE) {
        throw new StorageError(
          'Data exceeds maximum storage size limit',
          'save'
        );
      }

      // Use Chrome storage API
      await chrome.storage.local.set({ [key]: data });
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      // Handle Chrome storage API errors
      if (error instanceof Error) {
        if (error.message.includes('QUOTA_EXCEEDED')) {
          throw new StorageError(
            'Storage quota exceeded. Please remove some favorites to free up space.',
            'save',
            error
          );
        }
        throw new StorageError(
          `Failed to save data: ${error.message}`,
          'save',
          error
        );
      }
      
      throw new StorageError(
        'Unknown error occurred while saving data',
        'save'
      );
    }
  }

  /**
   * Load data from Chrome local storage
   * 
   * @param key Storage key
   * @returns Promise resolving to stored data or null if not found
   * @throws StorageError if load operation fails
   * 
   * Requirements: 6.2 - Retrieve saved History_Entry items
   */
  async load(key: string): Promise<any> {
    try {
      const result = await chrome.storage.local.get([key]);
      return result[key] || null;
    } catch (error) {
      if (error instanceof Error) {
        throw new StorageError(
          `Failed to load data: ${error.message}`,
          'load',
          error
        );
      }
      
      throw new StorageError(
        'Unknown error occurred while loading data',
        'load'
      );
    }
  }

  /**
   * Remove data from Chrome local storage
   * 
   * @param key Storage key to remove
   * @throws StorageError if remove operation fails
   */
  async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove([key]);
    } catch (error) {
      if (error instanceof Error) {
        throw new StorageError(
          `Failed to remove data: ${error.message}`,
          'remove',
          error
        );
      }
      
      throw new StorageError(
        'Unknown error occurred while removing data',
        'remove'
      );
    }
  }

  /**
   * Clear all data from Chrome local storage
   * 
   * @throws StorageError if clear operation fails
   */
  async clear(): Promise<void> {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      if (error instanceof Error) {
        throw new StorageError(
          `Failed to clear storage: ${error.message}`,
          'clear',
          error
        );
      }
      
      throw new StorageError(
        'Unknown error occurred while clearing storage',
        'clear'
      );
    }
  }

  /**
   * Load extension storage with validation and default fallback
   * 
   * @returns Promise resolving to ExtensionStorage
   * @throws StorageError if operation fails
   * 
   * Requirements: 6.2, 6.4 - Data integrity during retrieval
   */
  async loadExtensionStorage(): Promise<ExtensionStorage> {
    try {
      const data = await this.load(StorageService.STORAGE_KEY);
      
      if (!data) {
        // Return default storage for new installations
        return createDefaultStorage();
      }

      // Validate and normalize loaded data structure
      if (!this.isValidStorageData(data)) {
        console.warn('Invalid storage data detected, using defaults');
        return createDefaultStorage();
      }

      // Convert date strings back to Date objects if needed
      const storage: ExtensionStorage = {
        ...data,
        favorites: data.favorites.map((entry: any) => ({
          ...entry,
          createdAt: entry.createdAt instanceof Date ? entry.createdAt : new Date(entry.createdAt),
          updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt : new Date(entry.updatedAt)
        }))
      };
      console.log(storage)

      return storage;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      throw new StorageError(
        'Failed to load extension storage',
        'loadExtensionStorage',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate storage data structure with flexible date handling
   */
  private isValidStorageData(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false;
    
    // Check settings
    if (!obj.settings || typeof obj.settings !== 'object') return false;
    if (typeof obj.settings.maxFavorites !== 'number' || obj.settings.maxFavorites <= 0) return false;
    if (typeof obj.settings.defaultQRSize !== 'number' || obj.settings.defaultQRSize <= 0) return false;
    
    // Check favorites array
    if (!Array.isArray(obj.favorites)) return false;
    
    // Validate each favorite entry
    return obj.favorites.every((entry: any) => {
      return (
        typeof entry === 'object' &&
        entry !== null &&
        typeof entry.id === 'string' &&
        typeof entry.text === 'string' &&
        typeof entry.name === 'string'
      );
    });
  }

  /**
   * Save extension storage with validation
   * 
   * @param storage ExtensionStorage to save
   * @throws StorageError if operation fails
   * 
   * Requirements: 6.1, 6.4 - Store data with integrity
   */
  async saveExtensionStorage(storage: ExtensionStorage): Promise<void> {
    try {
      // Validate storage structure before saving
      if (!isExtensionStorage(storage)) {
        throw new StorageError(
          'Invalid storage data structure',
          'saveExtensionStorage'
        );
      }

      await this.save(StorageService.STORAGE_KEY, storage);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      throw new StorageError(
        'Failed to save extension storage',
        'saveExtensionStorage',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get current storage usage information
   * 
   * @returns Promise resolving to storage usage stats
   */
  async getStorageInfo(): Promise<{ bytesInUse: number; quota: number; usagePercentage: number }> {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const quota = StorageService.MAX_STORAGE_SIZE;
      const usagePercentage = Math.round((bytesInUse / quota) * 100);
      
      return {
        bytesInUse,
        quota,
        usagePercentage
      };
    } catch (error) {
      throw new StorageError(
        'Failed to get storage information',
        'getStorageInfo',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if storage has enough space for new data
   * 
   * @param estimatedSize Estimated size of new data in bytes
   * @returns Promise resolving to boolean indicating if space is available
   */
  async hasEnoughSpace(estimatedSize: number = 10000): Promise<boolean> {
    try {
      const { bytesInUse, quota } = await this.getStorageInfo();
      return (bytesInUse + estimatedSize) < (quota * 0.9); // Keep 10% buffer
    } catch (error) {
      console.warn('Could not check storage space:', error);
      return true; // Assume space is available if check fails
    }
  }

  /**
   * Export history data to JSON format
   * 
   * @returns Promise resolving to JSON string of history data
   */
  async exportHistory(): Promise<string> {
    try {
      const storage = await this.loadExtensionStorage();
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        favorites: storage.favorites.map(entry => {
          // Safely convert dates to ISO string
          let createdAt: string;
          let updatedAt: string;
          
          try {
            createdAt = entry.createdAt instanceof Date && !isNaN(entry.createdAt.getTime())
              ? entry.createdAt.toISOString()
              : (typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString());
          } catch {
            createdAt = new Date().toISOString();
          }
          
          try {
            updatedAt = entry.updatedAt instanceof Date && !isNaN(entry.updatedAt.getTime())
              ? entry.updatedAt.toISOString()
              : (typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date().toISOString());
          } catch {
            updatedAt = new Date().toISOString();
          }
          
          return {
            id: entry.id,
            text: entry.text,
            name: entry.name,
            createdAt,
            updatedAt
          };
        })
      };
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw new StorageError(
        'Failed to export history data',
        'exportHistory',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Import history data from JSON format
   * 
   * @param jsonData JSON string containing history data
   * @param mode Import mode: 'merge' to add to existing, 'replace' to overwrite
   * @returns Promise resolving to import result with count of imported items
   */
  async importHistory(jsonData: string, mode: 'merge' | 'replace' = 'merge'): Promise<{ imported: number; skipped: number }> {
    try {
      const importData = JSON.parse(jsonData);
      
      // Validate import data structure
      if (!this.isValidImportData(importData)) {
        throw new StorageError(
          '无效的导入文件格式',
          'importHistory'
        );
      }

      const storage = await this.loadExtensionStorage();
      let imported = 0;
      let skipped = 0;

      if (mode === 'replace') {
        // Replace mode: clear existing and import all
        storage.favorites = importData.favorites.map((entry: any) => ({
          id: entry.id || `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: entry.text,
          name: entry.name,
          createdAt: new Date(entry.createdAt),
          updatedAt: new Date(entry.updatedAt)
        }));
        imported = storage.favorites.length;
      } else {
        // Merge mode: add new entries, skip duplicates by text
        const existingTexts = new Set(storage.favorites.map(f => f.text));
        
        for (const entry of importData.favorites) {
          if (existingTexts.has(entry.text)) {
            skipped++;
            continue;
          }
          
          storage.favorites.push({
            id: `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: entry.text,
            name: entry.name,
            createdAt: new Date(entry.createdAt),
            updatedAt: new Date(entry.updatedAt)
          });
          existingTexts.add(entry.text);
          imported++;
        }
      }

      // Enforce max favorites limit
      if (storage.favorites.length > storage.settings.maxFavorites) {
        const excess = storage.favorites.length - storage.settings.maxFavorites;
        storage.favorites = storage.favorites
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, storage.settings.maxFavorites);
        skipped += excess;
      }

      await this.saveExtensionStorage(storage);
      
      return { imported, skipped };
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new StorageError(
          '无效的 JSON 格式',
          'importHistory'
        );
      }
      throw new StorageError(
        'Failed to import history data',
        'importHistory',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate import data structure
   */
  private isValidImportData(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false;
    if (!Array.isArray(obj.favorites)) return false;
    
    return obj.favorites.every((entry: any) => {
      return (
        typeof entry === 'object' &&
        entry !== null &&
        typeof entry.text === 'string' &&
        typeof entry.name === 'string' &&
        entry.text.trim().length > 0
      );
    });
  }
}