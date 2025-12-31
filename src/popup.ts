/**
 * Popup JavaScript Controller
 * 
 * Handles user interactions, manages UI state, and connects UI to business logic components
 */

import { HistoryEntry } from './types';
import { QRGenerator } from './qr-generator';
import { FavoritesManager } from './favorites-manager';
import { StorageService } from './storage-service';

/**
 * Main popup controller class that manages the entire popup interface
 */
class PopupController {
  private qrGenerator: QRGenerator;
  private favoritesManager: FavoritesManager;
  private storageService: StorageService;
  
  // UI Elements
  private textInput: HTMLTextAreaElement;
  private generateBtn: HTMLButtonElement;
  private historyBtn: HTMLButtonElement;
  private historyCount: HTMLElement;
  private qrContainer: HTMLElement;
  private favoritesSection: HTMLElement;
  private favoritesList: HTMLElement;
  private clearAllBtn: HTMLButtonElement;
  private storageInfo: HTMLElement;
  private storageUsage: HTMLElement;
  private favoritesCount: HTMLElement;
  
  // State management
  private currentFavoriteId: string | null = null;
  private isGenerating: boolean = false;
  private isHistoryVisible: boolean = false;

  constructor() {
    try {
      // Initialize business logic components
      this.storageService = new StorageService();
      this.favoritesManager = new FavoritesManager(this.storageService);
      this.qrGenerator = new QRGenerator();
      
      // Initialize UI elements
      this.textInput = document.getElementById('textInput') as HTMLTextAreaElement;
      this.generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
      this.historyBtn = document.getElementById('historyBtn') as HTMLButtonElement;
      this.historyCount = document.getElementById('historyCount') as HTMLElement;
      this.qrContainer = document.getElementById('qrCodeContainer') as HTMLElement;
      this.favoritesSection = document.getElementById('favoritesSection') as HTMLElement;
      this.favoritesList = document.getElementById('favoritesList') as HTMLElement;
      this.clearAllBtn = document.getElementById('clearAllBtn') as HTMLButtonElement;
      this.storageInfo = document.getElementById('storageInfo') as HTMLElement;
      this.storageUsage = document.getElementById('storageUsage') as HTMLElement;
      this.favoritesCount = document.getElementById('favoritesCount') as HTMLElement;
      
      // Validate required elements exist
      if (!this.textInput || !this.generateBtn || !this.qrContainer || !this.favoritesList || 
          !this.clearAllBtn || !this.historyBtn || !this.favoritesSection) {
        throw new Error('Required UI elements not found in DOM');
      }
      
      // Initialize event listeners
      this.initializeEventListeners();
      
      // Load initial state asynchronously
      this.loadInitialState().catch(error => {
        console.error('Failed to load initial state:', error);
        this.showError('初始化失败，请刷新重试');
      });
      
    } catch (error) {
      console.error('Failed to initialize PopupController:', error);
      throw error;
    }
  }

  /**
   * Initialize all event listeners for user interactions
   */
  private initializeEventListeners(): void {
    this.generateBtn.addEventListener('click', () => this.handleGenerateClick());
    this.textInput.addEventListener('input', () => this.handleTextInputChange());
    this.textInput.addEventListener('keydown', (e) => this.handleTextInputKeydown(e));
    this.textInput.addEventListener('focus', () => this.handleTextInputFocus());
    this.clearAllBtn.addEventListener('click', () => this.handleClearAllClick());
    this.historyBtn.addEventListener('click', () => this.toggleHistory());
  }

  /**
   * Toggle history panel visibility
   */
  private toggleHistory(): void {
    this.isHistoryVisible = !this.isHistoryVisible;
    this.favoritesSection.style.display = this.isHistoryVisible ? 'block' : 'none';
    this.historyBtn.classList.toggle('active', this.isHistoryVisible);
    
    if (this.isHistoryVisible) {
      this.refreshFavoritesList();
    }
  }

  /**
   * Close history panel
   */
  private closeHistory(): void {
    this.isHistoryVisible = false;
    this.favoritesSection.style.display = 'none';
    this.historyBtn.classList.remove('active');
  }

  /**
   * Update history count badge
   */
  private async updateHistoryCount(): Promise<void> {
    try {
      const favorites = await this.favoritesManager.getFavorites();
      const count = favorites.length;
      
      if (count > 0) {
        this.historyCount.textContent = count > 99 ? '99+' : String(count);
        this.historyCount.style.display = 'flex';
      } else {
        this.historyCount.style.display = 'none';
      }
    } catch (error) {
      console.warn('Failed to update history count:', error);
      this.historyCount.style.display = 'none';
    }
  }

  /**
   * Handle generate button click
   */
  private async handleGenerateClick(): Promise<void> {
    if (this.isGenerating) return;
    
    const text = this.textInput.value.trim();
    
    if (!this.qrGenerator.validateInput(text)) {
      if (!text) {
        this.showError('请输入文本内容');
      } else if (text.length > this.qrGenerator.getMaxInputLength()) {
        this.showError(`文本过长，最多支持 ${this.qrGenerator.getMaxInputLength()} 个字符`);
      } else {
        this.showError('输入内容无效，请检查后重试');
      }
      this.textInput.focus();
      return;
    }
    
    try {
      this.setGeneratingState(true);
      this.clearError();
      
      await this.qrGenerator.generateQRCode(text, this.qrContainer);
      
      try {
        if (this.currentFavoriteId) {
          await this.favoritesManager.updateFavorite(this.currentFavoriteId, { text: text });
          this.showSuccessMessage('已更新');
        } else {
          const newFavorite = await this.favoritesManager.saveFavorite(text);
          this.currentFavoriteId = newFavorite.id;
          this.showSuccessMessage('已保存');
        }
        
        await this.updateHistoryCount();
        if (this.isHistoryVisible) {
          await this.refreshFavoritesList();
        }
        
      } catch (storageError) {
        console.error('Storage error:', storageError);
        
        if (storageError instanceof Error) {
          if (storageError.message.includes('maximum limit')) {
            this.showWarning('已达到最大保存数量，请删除部分记录');
          } else if (storageError.message.includes('insufficient storage') || storageError.message.includes('quota')) {
            this.showWarning('存储空间已满，请删除部分记录');
          } else {
            this.showWarning('二维码已生成，但保存失败');
          }
        }
      }
      
    } catch (error) {
      console.error('Error generating QR code:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('capacity') || error.message.includes('too long')) {
          this.showError('文本过长，无法生成二维码');
        } else {
          this.showError(`生成失败: ${error.message}`);
        }
      } else {
        this.showError('生成二维码时发生错误，请重试');
      }
    } finally {
      this.setGeneratingState(false);
    }
  }

  /**
   * Handle text input changes
   */
  private handleTextInputChange(): void {
    const text = this.textInput.value.trim();
    const isValid = this.qrGenerator.validateInput(text);
    
    this.generateBtn.disabled = !isValid || this.isGenerating;
    this.saveInputState();
  }

  /**
   * Handle keyboard shortcuts in text input
   */
  private handleTextInputKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.handleGenerateClick();
    }
  }

  /**
   * Handle text input focus
   */
  private handleTextInputFocus(): void {
    this.textInput.style.borderColor = '#4285f4';
  }

  /**
   * Handle clear all favorites button click
   */
  private async handleClearAllClick(): Promise<void> {
    try {
      const favorites = await this.favoritesManager.getFavorites();
      
      if (favorites.length === 0) {
        this.showWarning('暂无记录可清空');
        return;
      }
      
      const confirmed = confirm(`确定要删除全部 ${favorites.length} 条记录吗？此操作无法撤销。`);
      
      if (!confirmed) return;
      
      this.clearAllBtn.disabled = true;
      this.clearAllBtn.textContent = '清空中...';
      
      await this.favoritesManager.clearAllFavorites();
      this.currentFavoriteId = null;
      
      await this.refreshFavoritesList();
      await this.updateHistoryCount();
      
      this.showSuccessMessage('已清空全部记录');
      
    } catch (error) {
      console.error('Error clearing all favorites:', error);
      this.showError('清空失败，请重试');
    } finally {
      this.clearAllBtn.disabled = false;
      this.clearAllBtn.textContent = '清空';
    }
  }

  /**
   * Load initial state when popup opens
   */
  private async loadInitialState(): Promise<void> {
    try {
      this.setLoadingState(true);
      
      await this.updateHistoryCount();
      await this.restoreInputState();
      
      this.textInput.focus();
      
    } catch (error) {
      console.error('Error loading initial state:', error);
      this.showError('加载失败，请刷新重试');
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Restore input state from session storage
   */
  private async restoreInputState(): Promise<void> {
    try {
      const savedInput = sessionStorage.getItem('qr_generator_input');
      if (savedInput && savedInput.trim()) {
        this.textInput.value = savedInput;
        this.handleTextInputChange();
      }
    } catch (error) {
      console.warn('Could not restore input state:', error);
    }
  }

  /**
   * Save current input state to session storage
   */
  private saveInputState(): void {
    try {
      const currentInput = this.textInput.value.trim();
      if (currentInput) {
        sessionStorage.setItem('qr_generator_input', currentInput);
      } else {
        sessionStorage.removeItem('qr_generator_input');
      }
    } catch (error) {
      console.warn('Could not save input state:', error);
    }
  }

  /**
   * Set loading state for the entire popup
   */
  private setLoadingState(isLoading: boolean): void {
    if (isLoading) {
      document.body.classList.add('loading');
      this.generateBtn.disabled = true;
      this.textInput.disabled = true;
    } else {
      document.body.classList.remove('loading');
      this.textInput.disabled = false;
      this.handleTextInputChange();
    }
  }


  /**
   * Refresh the favorites list display
   */
  private async refreshFavoritesList(): Promise<void> {
    try {
      const favorites = await this.favoritesManager.getFavorites();
      
      this.clearAllBtn.disabled = favorites.length === 0;
      this.clearAllBtn.style.display = favorites.length === 0 ? 'none' : 'inline-block';
      
      this.favoritesList.innerHTML = '';
      
      if (favorites.length === 0) {
        const noFavoritesDiv = document.createElement('div');
        noFavoritesDiv.className = 'no-favorites';
        noFavoritesDiv.textContent = '暂无历史记录';
        this.favoritesList.appendChild(noFavoritesDiv);
        return;
      }
      
      const sortedFavorites = favorites.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      sortedFavorites.forEach(favorite => {
        try {
          const favoriteElement = this.createFavoriteElement(favorite);
          this.favoritesList.appendChild(favoriteElement);
        } catch (elementError) {
          console.warn('Failed to create favorite element:', elementError);
        }
      });
      
    } catch (error) {
      console.error('Error refreshing favorites list:', error);
      
      this.favoritesList.innerHTML = `
        <div class="favorites-error" style="color: #d32f2f; text-align: center; padding: 16px; font-size: 13px;">
          <p>加载失败</p>
          <button onclick="location.reload()" style="margin-top: 8px; padding: 4px 8px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            重试
          </button>
        </div>
      `;
      
      this.clearAllBtn.style.display = 'none';
    }
  }

  /**
   * Create a DOM element for a favorite entry
   */
  private createFavoriteElement(favorite: HistoryEntry): HTMLElement {
    const favoriteDiv = document.createElement('div');
    favoriteDiv.className = 'favorite-item';
    favoriteDiv.dataset.favoriteId = favorite.id;
    
    favoriteDiv.addEventListener('click', async (e) => {
      if ((e.target as HTMLElement).closest('.action-buttons') || 
          favoriteDiv.classList.contains('editing')) {
        return;
      }
      await this.handleFavoriteClick(favorite);
    });
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'favorite-name';
    nameDiv.textContent = favorite.name;
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'favorite-name-input';
    nameInput.value = favorite.name;
    nameInput.maxLength = 100;
    
    const textDiv = document.createElement('div');
    textDiv.className = 'favorite-text';
    textDiv.textContent = favorite.text;
    textDiv.title = favorite.text;
    
    const renameBtn = document.createElement('button');
    renameBtn.className = 'rename-btn';
    renameBtn.innerHTML = '✏️';
    renameBtn.title = '重命名';
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startRename(favoriteDiv, favorite);
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = '删除';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleDeleteFavorite(favorite);
    });
    
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    actionButtons.appendChild(renameBtn);
    actionButtons.appendChild(deleteBtn);
    
    const renameActions = document.createElement('div');
    renameActions.className = 'rename-actions';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'rename-confirm-btn';
    confirmBtn.textContent = '保存';
    confirmBtn.addEventListener('click', () => {
      this.confirmRename(favoriteDiv, favorite, nameInput.value.trim());
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'rename-cancel-btn';
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', () => {
      this.cancelRename(favoriteDiv, favorite);
    });
    
    renameActions.appendChild(confirmBtn);
    renameActions.appendChild(cancelBtn);
    
    nameInput.addEventListener('input', () => {
      const isValid = nameInput.value.trim().length > 0;
      confirmBtn.disabled = !isValid;
    });
    
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (nameInput.value.trim().length > 0) {
          this.confirmRename(favoriteDiv, favorite, nameInput.value.trim());
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelRename(favoriteDiv, favorite);
      }
    });
    
    favoriteDiv.appendChild(nameDiv);
    favoriteDiv.appendChild(nameInput);
    favoriteDiv.appendChild(textDiv);
    favoriteDiv.appendChild(actionButtons);
    favoriteDiv.appendChild(renameActions);
    
    return favoriteDiv;
  }

  /**
   * Handle favorite item click
   */
  private async handleFavoriteClick(favorite: HistoryEntry): Promise<void> {
    this.textInput.value = favorite.text;
    this.currentFavoriteId = favorite.id;
    this.textInput.focus();
    this.handleTextInputChange();
    this.highlightSelectedFavorite(favorite.id);
    
    // 关闭 Popper
    this.closeHistory();
    
    try {
      this.setGeneratingState(true);
      await this.qrGenerator.generateQRCode(favorite.text, this.qrContainer);
    } catch (error) {
      console.error('Error regenerating QR code:', error);
      this.showError('生成二维码失败');
    } finally {
      this.setGeneratingState(false);
    }
  }

  /**
   * Handle delete favorite
   */
  private async handleDeleteFavorite(favorite: HistoryEntry): Promise<void> {
    try {
      const confirmed = confirm(`确定要删除"${favorite.name}"吗？`);
      
      if (!confirmed) return;
      
      const deleted = await this.favoritesManager.deleteFavorite(favorite.id);
      
      if (deleted) {
        if (this.currentFavoriteId === favorite.id) {
          this.currentFavoriteId = null;
        }
        
        await this.refreshFavoritesList();
        await this.updateHistoryCount();
        
        this.showSuccessMessage('已删除');
      } else {
        this.showWarning('记录不存在或已被删除');
      }
      
    } catch (error) {
      console.error('Error deleting favorite:', error);
      this.showError('删除失败，请重试');
    }
  }

  /**
   * Highlight the selected favorite in the list
   */
  private highlightSelectedFavorite(favoriteId: string): void {
    const previouslySelected = this.favoritesList.querySelector('.favorite-item.selected');
    if (previouslySelected) {
      previouslySelected.classList.remove('selected');
    }
    
    const selectedElement = this.favoritesList.querySelector(`[data-favorite-id="${favoriteId}"]`);
    if (selectedElement) {
      selectedElement.classList.add('selected');
    }
  }

  /**
   * Set generating state and update UI accordingly
   */
  private setGeneratingState(isGenerating: boolean): void {
    this.isGenerating = isGenerating;
    
    this.generateBtn.disabled = isGenerating || !this.qrGenerator.validateInput(this.textInput.value.trim());
    this.generateBtn.textContent = isGenerating ? '生成中...' : '生成二维码';
    this.textInput.disabled = isGenerating;
    
    if (isGenerating) {
      this.qrContainer.innerHTML = `
        <div class="loading" style="text-align: center; padding: 32px; color: #666;">
          <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #4285f4; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 8px;"></div>
          <div style="font-size: 12px;">生成中...</div>
        </div>
      `;
    }
  }

  /**
   * Show error message to user
   */
  private showError(message: string): void {
    this.qrContainer.innerHTML = `
      <div class="error-message" style="color: #d32f2f; text-align: center; padding: 16px; font-size: 13px; background-color: #ffebee; border-radius: 4px; border: 1px solid #ffcdd2;">
        ${message}
      </div>
    `;
    
    setTimeout(() => {
      if (this.qrContainer.querySelector('.error-message')) {
        this.qrContainer.innerHTML = '<div class="placeholder-text">二维码将在此显示</div>';
      }
    }, 5000);
  }

  /**
   * Show warning message to user
   */
  private showWarning(message: string): void {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'warning-message';
    warningDiv.innerHTML = `
      <div style="background-color: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; border: 1px solid #ffeaa7; margin: 8px 0; font-size: 12px;">
        ${message}
      </div>
    `;
    
    const container = document.querySelector('.container');
    if (container && container.firstChild) {
      container.insertBefore(warningDiv, container.firstChild);
    }
    
    setTimeout(() => {
      if (warningDiv.parentNode) {
        warningDiv.parentNode.removeChild(warningDiv);
      }
    }, 4000);
  }

  /**
   * Clear any existing error messages
   */
  private clearError(): void {
    const errorMessage = this.qrContainer.querySelector('.error-message');
    if (errorMessage) {
      this.qrContainer.innerHTML = '<div class="placeholder-text">二维码将在此显示</div>';
    }
  }

  /**
   * Start rename operation for a favorite
   */
  private startRename(favoriteElement: HTMLElement, favorite: HistoryEntry): void {
    favoriteElement.classList.add('editing');
    
    const nameInput = favoriteElement.querySelector('.favorite-name-input') as HTMLInputElement;
    if (nameInput) {
      nameInput.focus();
      nameInput.select();
    }
  }

  /**
   * Confirm rename operation
   */
  private async confirmRename(favoriteElement: HTMLElement, favorite: HistoryEntry, newName: string): Promise<void> {
    if (!newName || newName.trim().length === 0) {
      this.showError('名称不能为空');
      return;
    }
    
    if (newName === favorite.name) {
      this.cancelRename(favoriteElement, favorite);
      return;
    }
    
    const confirmBtn = favoriteElement.querySelector('.rename-confirm-btn') as HTMLButtonElement;
    const cancelBtn = favoriteElement.querySelector('.rename-cancel-btn') as HTMLButtonElement;
    const originalConfirmText = confirmBtn.textContent;
    
    try {
      confirmBtn.textContent = '保存中...';
      confirmBtn.disabled = true;
      cancelBtn.disabled = true;
      
      await this.favoritesManager.renameFavorite(favorite.id, newName);
      
      const nameDiv = favoriteElement.querySelector('.favorite-name') as HTMLElement;
      if (nameDiv) {
        nameDiv.textContent = newName;
      }
      
      favorite.name = newName;
      favoriteElement.classList.remove('editing');
      
      this.showSuccessMessage('已重命名');
      
    } catch (error) {
      console.error('Error renaming favorite:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('storage') || error.message.includes('quota')) {
          this.showError('存储空间已满，无法重命名');
        } else if (error.message.includes('not found')) {
          this.showError('记录不存在，请刷新列表');
          this.refreshFavoritesList().catch(() => {});
        } else {
          this.showError(`重命名失败: ${error.message}`);
        }
      } else {
        this.showError('重命名失败，请重试');
      }
      
      const nameInput = favoriteElement.querySelector('.favorite-name-input') as HTMLInputElement;
      if (nameInput) {
        nameInput.value = favorite.name;
      }
    } finally {
      confirmBtn.textContent = originalConfirmText;
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  }

  /**
   * Cancel rename operation
   */
  private cancelRename(favoriteElement: HTMLElement, favorite: HistoryEntry): void {
    const nameInput = favoriteElement.querySelector('.favorite-name-input') as HTMLInputElement;
    if (nameInput) {
      nameInput.value = favorite.name;
    }
    
    favoriteElement.classList.remove('editing');
  }

  /**
   * Show success message to user
   */
  private showSuccessMessage(message: string): void {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #4caf50;
      color: white;
      padding: 6px 14px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s;
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
      successDiv.style.opacity = '1';
    }, 10);
    
    setTimeout(() => {
      successDiv.style.opacity = '0';
      setTimeout(() => {
        if (successDiv.parentNode) {
          successDiv.parentNode.removeChild(successDiv);
        }
      }, 300);
    }, 1500);
  }

  onPopupVisible(): void {
    this.updateHistoryCount();
    if (this.isHistoryVisible) {
      this.refreshFavoritesList().catch(error => {
        console.warn('Failed to refresh favorites on popup visible:', error);
      });
    }
  }

  onPopupHidden(): void {
    this.saveInputState();
  }

  cleanup(): void {
    try {
      this.saveInputState();
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  }
}

// Initialize popup controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    const controller = new PopupController();
    
    window.addEventListener('beforeunload', () => {
      controller.cleanup();
    });
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        controller.onPopupHidden();
      } else {
        controller.onPopupVisible();
      }
    });
    
    console.log('二维码生成器扩展初始化成功');
  } catch (error) {
    console.error('Failed to initialize popup controller:', error);
    
    const container = document.querySelector('.container');
    if (container) {
      container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #d32f2f;">
          <h3 style="margin-bottom: 12px;">初始化失败</h3>
          <p style="font-size: 13px; margin-bottom: 16px;">扩展加载出错，请尝试以下操作：</p>
          <button onclick="window.location.reload()" style="padding: 8px 16px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
            刷新重试
          </button>
        </div>
      `;
    }
  }
});
