/**
 * Formats a number as ARS (Argentine Pesos) currency string.
 *
 * @example formatCurrency(80000)   // "$80.000"
 * @example formatCurrency(1500.50) // "$1.500,50"
 * @example formatCurrency("80000") // "$80.000"
 */
export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;

  if (isNaN(num)) return "$0";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}
