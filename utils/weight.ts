/**
 * Weight conversion utilities
 * Storage: Always in pounds (lbs)
 * Display: Based on user preference
 */

export type WeightUnit = 'lbs' | 'kg';

export const lbsToKg = (lbs: number): number => {
  return lbs * 0.453592;
};

export const kgToLbs = (kg: number): number => {
  return kg * 2.20462;
};

export const formatWeight = (weightLbs: number, unit: WeightUnit): string => {
  if (unit === 'kg') {
    return `${lbsToKg(weightLbs).toFixed(1)}kg`;
  }
  return `${weightLbs.toFixed(0)}lbs`;
};

export const convertWeight = (weightLbs: number, unit: WeightUnit): number => {
  if (unit === 'kg') {
    return lbsToKg(weightLbs);
  }
  return weightLbs;
};

export const parseWeightInput = (input: string, unit: WeightUnit): number => {
  const value = parseFloat(input) || 0;
  if (unit === 'kg') {
    // Convert kg input back to lbs for storage
    return kgToLbs(value);
  }
  return value;
};
