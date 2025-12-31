/**
 * Core data models and interfaces for the QR Code Generator Chrome Extension
 * 
 * These interfaces define the structure for favorites management and storage
 * as specified in Requirements 2.1 and 6.4
 */

/**
 * Represents a saved QR code generation entry in the favorites system
 * 
 * Requirements: 2.1 - Automatic saving of QR code generation history
 * Requirements: 6.4 - Data integrity during storage and retrieval operations
 */
export interface HistoryEntry {
  /** Unique identifier for the entry (UUID or timestamp-based) */
  id: string;
  
  /** Original text input used to generate the QR code */
  text: string;
  
  /** User-defined name for the entry (can be auto-generated default) */
  name: string;
  
  /** Timestamp when the entry was first created */
  createdAt: Date;
  
  /** Timestamp when the entry was last modified */
  updatedAt: Date;
}

/**
 * Extension settings configuration
 */
export interface ExtensionSettings {
  /** Maximum number of favorites to store (default: 100) */
  maxFavorites: number;
  
  /** Default QR code size in pixels (default: 256) */
  defaultQRSize: number;
  
  /** ID of the last accessed history entry */
  lastAccessedId?: string;
}

/**
 * Complete storage schema for the Chrome extension
 * 
 * Requirements: 6.4 - Data integrity during storage and retrieval operations
 */
export interface ExtensionStorage {
  /** Array of saved favorite QR code entries */
  favorites: HistoryEntry[];
  
  /** Extension configuration settings */
  settings: ExtensionSettings;
}

/**
 * Type guard to check if an object is a valid HistoryEntry
 */
export function isHistoryEntry(obj: any): obj is HistoryEntry {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.text === 'string' &&
    typeof obj.name === 'string' &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date
  );
}

/**
 * Type guard to check if an object is valid ExtensionSettings
 */
export function isExtensionSettings(obj: any): obj is ExtensionSettings {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.maxFavorites === 'number' &&
    typeof obj.defaultQRSize === 'number' &&
    obj.maxFavorites > 0 &&
    obj.defaultQRSize > 0
  );
}

/**
 * Type guard to check if an object is valid ExtensionStorage
 */
export function isExtensionStorage(obj: any): obj is ExtensionStorage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Array.isArray(obj.favorites) &&
    obj.favorites.every(isHistoryEntry) &&
    isExtensionSettings(obj.settings)
  );
}

/**
 * Default settings for new installations
 */
export const DEFAULT_SETTINGS: ExtensionSettings = {
  maxFavorites: 100,
  defaultQRSize: 256
};

/**
 * Creates a new HistoryEntry with the provided data
 */
export function createHistoryEntry(
  text: string,
  name: string,
  id?: string
): HistoryEntry {
  const now = new Date();
  return {
    id: id || `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    text,
    name,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Creates default ExtensionStorage structure
 */
export function createDefaultStorage(): ExtensionStorage {
  return {
    favorites: [],
    settings: { ...DEFAULT_SETTINGS }
  };
}