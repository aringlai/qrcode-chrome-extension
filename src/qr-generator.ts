/**
 * QR Code Generator Component
 * 
 * Handles QR code generation, validation, and display functionality
 * Requirements: 1.1, 1.2, 1.4
 */

import * as QRCode from 'qrcode';

/**
 * QR Generator class responsible for generating QR codes from text input
 * and managing QR code display in the popup interface
 */
export class QRGenerator {
  private readonly maxInputLength: number;
  private readonly qrCodeSize: number;

  constructor(maxInputLength: number = 2953, qrCodeSize: number = 256) {
    // QR Code capacity limit for alphanumeric mode (Level L error correction)
    this.maxInputLength = maxInputLength;
    this.qrCodeSize = qrCodeSize;
  }

  /**
   * Generates a QR code from the provided text and displays it in the container
   * 
   * Requirements: 1.1 - Generate QR code from text input
   * Requirements: 1.4 - Handle QR code capacity limits gracefully
   * 
   * @param text - The text to encode in the QR code
   * @param container - The HTML element where the QR code will be displayed
   * @throws Error if QR code generation fails
   */
  async generateQRCode(text: string, container: HTMLElement): Promise<void> {
    try {
      // Validate input before generation
      if (!this.validateInput(text)) {
        throw new Error('Invalid input: Text is empty or exceeds maximum length');
      }

      // Clear any existing QR code
      this.clearDisplay(container);

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(text, {
        width: this.qrCodeSize,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'L' // Low error correction for maximum capacity
      });

      // Create and display the QR code image
      const img = document.createElement('img');
      img.src = qrCodeDataUrl;
      img.alt = 'Generated QR Code';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '0 auto';

      container.appendChild(img);

    } catch (error) {
      // Handle QR code generation errors gracefully
      this.displayError(container, this.getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Validates the input text for QR code generation
   * 
   * Requirements: 1.2 - Prevent generation with empty input
   * Requirements: 1.4 - Handle capacity limits
   * 
   * @param text - The text to validate
   * @returns true if the input is valid, false otherwise
   */
  validateInput(text: string): boolean {
    // Check for empty or whitespace-only input
    if (!text || text.trim().length === 0) {
      return false;
    }

    // Check for length limits (QR code capacity)
    if (text.length > this.maxInputLength) {
      return false;
    }

    return true;
  }

  /**
   * Clears the QR code display container
   * 
   * @param container - The HTML element to clear
   */
  clearDisplay(container: HTMLElement): void {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  /**
   * Gets the maximum input length supported by this QR generator
   * 
   * @returns The maximum number of characters that can be encoded
   */
  getMaxInputLength(): number {
    return this.maxInputLength;
  }

  /**
   * Gets the QR code size in pixels
   * 
   * @returns The QR code size in pixels
   */
  getQRCodeSize(): number {
    return this.qrCodeSize;
  }

  /**
   * Generates a QR code and returns the data URL without displaying it
   * Useful for saving to favorites without requiring a DOM container
   * 
   * @param text - The text to encode
   * @returns Promise resolving to the QR code data URL
   */
  async generateQRCodeDataUrl(text: string): Promise<string> {
    if (!this.validateInput(text)) {
      throw new Error('Invalid input: Text is empty or exceeds maximum length');
    }

    try {
      return await QRCode.toDataURL(text, {
        width: this.qrCodeSize,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'L'
      });
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Displays an error message in the container
   * 
   * @param container - The HTML element to display the error in
   * @param message - The error message to display
   */
  private displayError(container: HTMLElement, message: string): void {
    this.clearDisplay(container);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'qr-error';
    errorDiv.style.color = '#d32f2f';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.padding = '16px';
    errorDiv.style.fontSize = '14px';
    errorDiv.textContent = message;
    
    container.appendChild(errorDiv);
  }

  /**
   * Extracts a user-friendly error message from an error object
   * 
   * @param error - The error object
   * @returns A user-friendly error message
   */
  private getErrorMessage(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'An unexpected error occurred while generating the QR code';
  }
}

/**
 * Default QR Generator instance with standard settings
 */
export const defaultQRGenerator = new QRGenerator();