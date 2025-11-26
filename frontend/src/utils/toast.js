/**
 * Simple toast notification utility
 * Creates temporary toast messages for user feedback
 */

let toastContainer = null;

// Initialize toast container
const getToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
};

// Show toast notification
export const showToast = (message, type = 'error', duration = 4000) => {
  const container = getToastContainer();

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    font-size: 14px;
    font-weight: 500;
    max-width: 350px;
    pointer-events: auto;
    animation: slideIn 0.3s ease-out;
    opacity: 1;
    transition: opacity 0.3s ease-out;
  `;

  toast.textContent = message;
  container.appendChild(toast);

  // Add slide-in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  if (!document.querySelector('#toast-animations')) {
    style.id = 'toast-animations';
    document.head.appendChild(style);
  }

  // Auto-remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
};

// Export shorthand methods
export const errorToast = (message, duration) => showToast(message, 'error', duration);
export const successToast = (message, duration) => showToast(message, 'success', duration);
export const infoToast = (message, duration) => showToast(message, 'info', duration);
