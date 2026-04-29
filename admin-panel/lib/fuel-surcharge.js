/**
 * Fuel Surcharge Rate Lookup
 *
 * Rate is calculated from the national average diesel price (updated every Monday).
 * Source: https://www.eia.gov/petroleum/gasdiesel
 *
 * Formula derived from the rate table:
 *   - Minimum (≤ $1.84): 9.50%
 *   - Each additional $0.05 bracket adds 0.50%
 *
 * @param {number} fuelPrice - current national average diesel price in $/gal
 * @returns {number} surcharge rate as a percentage (e.g. 25.5)
 */
export function getFuelSurchargeRate(fuelPrice) {
  const price = parseFloat(fuelPrice);
  if (!price || price <= 1.84) return 9.5;
  // Multiply by 100 before dividing to avoid floating-point drift
  const brackets = Math.ceil(Math.round((price - 1.84) * 100) / 5);
  return 9.5 + brackets * 0.5;
}

/**
 * Calculate fuel surcharge fee for a given base rate and fuel price.
 * @param {number|null} baseRate
 * @param {number}      fuelPrice
 * @returns {number|null}
 */
export function getFuelFee(baseRate, fuelPrice) {
  if (baseRate === null || !fuelPrice) return null;
  const rate = getFuelSurchargeRate(fuelPrice);
  return baseRate * (rate / 100);
}
