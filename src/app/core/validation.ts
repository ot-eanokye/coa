export const DEBLIN_EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@deblin\.com$/i;
export const EMAIL_USERNAME_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
export const NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;
export const MONTH_YEAR_PATTERN = /^(0[1-9]|1[0-2])\/\d{4}$/;

export function isDeblinEmail(value: string): boolean {
  return DEBLIN_EMAIL_PATTERN.test(value.trim());
}

export function isMonthYear(value: string): boolean {
  return MONTH_YEAR_PATTERN.test(value.trim());
}

export function isValidDateRange(start: string, end: string): boolean {
  if (!isMonthYear(start) || !isMonthYear(end)) {
    return false;
  }
  const [startMonth, startYear] = start.split('/').map(Number);
  const [endMonth, endYear] = end.split('/').map(Number);
  return endYear * 12 + endMonth >= startYear * 12 + startMonth;
}
