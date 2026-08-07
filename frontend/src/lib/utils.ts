import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ISO_PATTERN = /^[A-Z]{3}[UJZ]\d{7}$/;

export function isValidMatricula(value: string): boolean {
  if (!value) return false;
  const clean = value.toUpperCase().replace(/\s/g, "");
  if (!ISO_PATTERN.test(clean)) return false;
  return true;
}
