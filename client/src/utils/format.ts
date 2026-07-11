/**
 * Formats a numeric value into Indian Rupees (INR) using standard Indian number formatting (lakhs/crores).
 * Example: 100000 -> ₹1,00,000.00
 */
export const formatINR = (value: number): string => {
  if (value === undefined || value === null || isNaN(value)) {
    value = 0;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
};
