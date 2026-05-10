/**
 * Format number to VND currency string
 * @param {number} price 
 * @returns {string}
 */
export const formatPrice = (price) => {
  if (price === undefined || price === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
};

/**
 * Format ISO date string to Vietnamese locale date string
 * @param {string} dateString 
 * @param {boolean} includeTime 
 * @returns {string}
 */
export const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return '---';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '---';
  
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
  };
  
  return date.toLocaleDateString('vi-VN', options);
};

/**
 * Truncate text with ellipsis
 * @param {string} text 
 * @param {number} limit 
 * @returns {string}
 */
export const truncateText = (text, limit = 50) => {
  if (!text) return '';
  return text.length > limit ? `${text.substring(0, limit)}...` : text;
};
