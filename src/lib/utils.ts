import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "USD", showSign = false): string {
  const num = Number(value) || 0;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));

  if (num < 0) return `-${formatted}`;
  if (showSign && num > 0) return `+${formatted}`;
  return formatted;
}
