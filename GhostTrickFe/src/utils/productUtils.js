/**
 * Calculates the discount percentage between originalPrice and price.
 * Formula: ((originalPrice - price) / originalPrice) * 100
 * @param {number} price Current price
 * @param {number} originalPrice Original price
 * @returns {number} Percentage rounded to nearest integer
 */
export const calculateSalePercentage = (price, originalPrice) => {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
};
