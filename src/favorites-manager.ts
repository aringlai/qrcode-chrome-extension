/**
 * FavoritesManager - Favorites Management System
 * 
 * Handles CRUD operations for QR code favorites with automatic default naming
 * and storage integration for the Chrome extension.
 * 
 * Requirements:
 * - 2.1: Automatically save QR code generation history as favorites
 * - 2.2: Assign default names based on input text or timestamp
 * - 3.3: Update existing History_Entry with new text and QR code
 * - 3.4: Preserve user-defined name unless explicitly changed
 */

import { HistoryEntry, ExtensionStorage, createHistoryEntry } from './types';
import { StorageService, StorageError } from './storage-service';

/**
 * Error types for favorites management operations
 */
export class FavoritesError extends Error {
  constructor(message: string, public readonly operation: string, public readonly cause?: Error) {
    super(message);
    this.name = 'FavoritesError';
  }
}

/**
 * Manages favorites CRUD operations with automatic naming and storage persistence
 */
export class FavoritesManager {
  private storageService: StorageService;
  private cache: ExtensionStorage | null = null;

  constructor(storageService?: StorageService) {
    this.storageService = storageService || new StorageService();
  }

  /**
   * Save a new favorite entry with automatic default naming
   * 
   * @param text Original text input for QR code
   * @param customName Optional custom name (if not provided, generates default)
   * @returns Promise resolving to the created HistoryEntry
   * @throws FavoritesError if save operation fails
   * 
   * Requirements: 2.1, 2.2 - Automatic saving with default naming
   */
  async saveFavorite(text: string, customName?: string): Promise<HistoryEntry> {
    try {
      // Load current storage
      const storage = await this.loadStorage();
      
      // Check if we're at the maximum favorites limit
      if (storage.favorites.length >= storage.settings.maxFavorites) {
        throw new FavoritesError(
          `Cannot save favorite: maximum limit of ${storage.settings.maxFavorites} favorites reached`,
          'saveFavorite'
        );
      }

      // Estimate size of new favorite entry (much smaller without QR code data)
      const estimatedSize = JSON.stringify({
        text,
        name: customName || this.generateDefaultName(text)
      }).length * 2; // UTF-16 encoding approximation

      // Check storage space before saving
      const hasSpace = await this.storageService.hasEnoughSpace(estimatedSize);
      if (!hasSpace) {
        throw new FavoritesError(
          'Cannot save favorite: insufficient storage space. Please remove some favorites to free up space.',
          'saveFavorite'
        );
      }

      // Generate default name if not provided
      const name = customName || this.generateDefaultName(text);
      
      // Create new history entry (without QR code data - will be regenerated on demand)
      const entry = createHistoryEntry(text, name);
      
      // Add to favorites array
      storage.favorites.push(entry);
      
      // Save to storage
      await this.storageService.saveExtensionStorage(storage);
      
      // Update cache
      this.cache = storage;
      
      return entry;
    } catch (error) {
      if (error instanceof FavoritesError || error instanceof StorageError) {
        throw error;
      }
      
      throw new FavoritesError(
        'Failed to save favorite',
        'saveFavorite',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Retrieve all saved favorites
   * 
   * @returns Promise resolving to array of HistoryEntry items
   * @throws FavoritesError if retrieval fails
   * 
   * Requirements: 2.3 - Display all saved History_Entry items
   */
  async getFavorites(): Promise<HistoryEntry[]> {
    try {
      const storage = await this.loadStorage();
      
      // Return a copy to prevent external modification
      return storage.favorites.map(entry => ({ ...entry }));
    } catch (error) {
      if (error instanceof StorageError) {
        throw new FavoritesError(
          'Failed to retrieve favorites',
          'getFavorites',
          error
        );
      }
      
      throw new FavoritesError(
        'Failed to retrieve favorites',
        'getFavorites',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update an existing favorite entry
   * 
   * @param id Unique identifier of the entry to update
   * @param updates Partial HistoryEntry with fields to update
   * @returns Promise resolving to the updated HistoryEntry
   * @throws FavoritesError if update fails or entry not found
   * 
   * Requirements: 3.3, 3.4 - Update entry while preserving user-defined name
   */
  async updateFavorite(id: string, updates: Partial<Omit<HistoryEntry, 'id' | 'createdAt'>>): Promise<HistoryEntry> {
    try {
      const storage = await this.loadStorage();
      
      // Find the entry to update
      const entryIndex = storage.favorites.findIndex(entry => entry.id === id);
      if (entryIndex === -1) {
        throw new FavoritesError(
          `Favorite with id '${id}' not found`,
          'updateFavorite'
        );
      }
      
      const existingEntry = storage.favorites[entryIndex];
      if (!existingEntry) {
        throw new FavoritesError(
          `Favorite with id '${id}' not found`,
          'updateFavorite'
        );
      }
      
      // Create updated entry, preserving createdAt and updating updatedAt
      const updatedEntry: HistoryEntry = {
        id: existingEntry.id, // Ensure id cannot be changed
        text: existingEntry.text,
        name: existingEntry.name,
        createdAt: existingEntry.createdAt, // Preserve creation date
        updatedAt: new Date(), // Update modification timestamp
        ...updates // Apply updates after setting defaults
      };
      
      // Replace the entry in the array
      storage.favorites[entryIndex] = updatedEntry;
      
      // Save to storage
      await this.storageService.saveExtensionStorage(storage);
      
      // Update cache
      this.cache = storage;
      
      return { ...updatedEntry };
    } catch (error) {
      if (error instanceof FavoritesError || error instanceof StorageError) {
        throw error;
      }
      
      throw new FavoritesError(
        'Failed to update favorite',
        'updateFavorite',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete a favorite entry by ID
   * 
   * @param id Unique identifier of the entry to delete
   * @returns Promise resolving to true if deleted, false if not found
   * @throws FavoritesError if delete operation fails
   */
  async deleteFavorite(id: string): Promise<boolean> {
    try {
      const storage = await this.loadStorage();
      
      // Find and remove the entry
      const initialLength = storage.favorites.length;
      storage.favorites = storage.favorites.filter(entry => entry.id !== id);
      
      // Check if anything was actually removed
      const wasDeleted = storage.favorites.length < initialLength;
      
      if (wasDeleted) {
        // Save updated storage
        await this.storageService.saveExtensionStorage(storage);
        
        // Update cache
        this.cache = storage;
      }
      
      return wasDeleted;
    } catch (error) {
      if (error instanceof StorageError) {
        throw new FavoritesError(
          'Failed to delete favorite',
          'deleteFavorite',
          error
        );
      }
      
      throw new FavoritesError(
        'Failed to delete favorite',
        'deleteFavorite',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Rename a favorite entry
   * 
   * @param id Unique identifier of the entry to rename
   * @param newName New name for the entry
   * @returns Promise resolving to the updated HistoryEntry
   * @throws FavoritesError if rename fails or entry not found
   * 
   * Requirements: 4.2 - Update History_Entry with new name
   */
  async renameFavorite(id: string, newName: string): Promise<HistoryEntry> {
    // Validate new name is not empty
    if (!newName || newName.trim().length === 0) {
      throw new FavoritesError(
        'Name cannot be empty',
        'renameFavorite'
      );
    }
    
    return this.updateFavorite(id, { name: newName.trim() });
  }

  /**
   * Find a favorite entry by ID
   * 
   * @param id Unique identifier of the entry
   * @returns Promise resolving to HistoryEntry or null if not found
   */
  async findFavoriteById(id: string): Promise<HistoryEntry | null> {
    try {
      const favorites = await this.getFavorites();
      return favorites.find(entry => entry.id === id) || null;
    } catch (error) {
      throw new FavoritesError(
        'Failed to find favorite',
        'findFavoriteById',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Clear all favorites
   * 
   * @returns Promise resolving when all favorites are cleared
   * @throws FavoritesError if clear operation fails
   */
  async clearAllFavorites(): Promise<void> {
    try {
      const storage = await this.loadStorage();
      storage.favorites = [];
      
      await this.storageService.saveExtensionStorage(storage);
      this.cache = storage;
    } catch (error) {
      if (error instanceof StorageError) {
        throw new FavoritesError(
          'Failed to clear favorites',
          'clearAllFavorites',
          error
        );
      }
      
      throw new FavoritesError(
        'Failed to clear favorites',
        'clearAllFavorites',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get favorites count
   * 
   * @returns Promise resolving to number of saved favorites
   */
  async getFavoritesCount(): Promise<number> {
    try {
      const favorites = await this.getFavorites();
      return favorites.length;
    } catch (error) {
      throw new FavoritesError(
        'Failed to get favorites count',
        'getFavoritesCount',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Load storage with caching
   */
  private async loadStorage(): Promise<ExtensionStorage> {
    // Always load fresh data from storage to ensure consistency
    // This prevents cache invalidation issues when popup reopens
    this.cache = await this.storageService.loadExtensionStorage();
    return this.cache;
  }

  /**
   * Generate a default name for a favorite based on text input
   * 
   * @param text Original text input
   * @returns Generated default name
   * 
   * Requirements: 2.2 - Assign default name based on input text or timestamp
   */
  private generateDefaultName(text: string): string {
    // Clean and truncate text for name generation
    const cleanText = text.trim().replace(/\s+/g, ' ');
    
    if (cleanText.length === 0) {
      // Use timestamp if text is empty
      return `QR Code ${new Date().toLocaleString()}`;
    }
    
    // Use first 30 characters of text, or full text if shorter
    if (cleanText.length <= 30) {
      return cleanText;
    }
    
    // Truncate at word boundary if possible
    const truncated = cleanText.substring(0, 30);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > 15) {
      // Truncate at last word boundary if it's not too short
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    // Otherwise just truncate and add ellipsis
    return truncated + '...';
  }

  /**
   * Get storage usage information
   * 
   * @returns Promise resolving to storage usage stats
   */
  async getStorageUsage(): Promise<{ 
    bytesInUse: number; 
    quota: number; 
    usagePercentage: number;
    favoritesCount: number;
    maxFavorites: number;
  }> {
    try {
      const storageInfo = await this.storageService.getStorageInfo();
      const storage = await this.loadStorage();
      
      return {
        ...storageInfo,
        favoritesCount: storage.favorites.length,
        maxFavorites: storage.settings.maxFavorites
      };
    } catch (error) {
      throw new FavoritesError(
        'Failed to get storage usage information',
        'getStorageUsage',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Set the last accessed favorite ID
   * 
   * @param id ID of the last accessed favorite
   */
  async setLastAccessedId(id: string | null): Promise<void> {
    try {
      const storage = await this.loadStorage();
      if (id === null) {
        delete storage.settings.lastAccessedId;
      } else {
        storage.settings.lastAccessedId = id;
      }
      await this.storageService.saveExtensionStorage(storage);
      this.cache = storage;
    } catch (error) {
      console.warn('Failed to save last accessed ID:', error);
    }
  }

  /**
   * Get the last accessed favorite entry
   * 
   * @returns Promise resolving to the last accessed HistoryEntry or null
   */
  async getLastAccessedFavorite(): Promise<HistoryEntry | null> {
    try {
      const storage = await this.loadStorage();
      const lastAccessedId = storage.settings.lastAccessedId;
      
      if (!lastAccessedId) {
        return null;
      }
      
      const favorite = storage.favorites.find(entry => entry.id === lastAccessedId);
      return favorite ? { ...favorite } : null;
    } catch (error) {
      console.warn('Failed to get last accessed favorite:', error);
      return null;
    }
  }

  /**
   * Invalidate cache to force reload from storage
   */
  invalidateCache(): void {
    this.cache = null;
  }
}