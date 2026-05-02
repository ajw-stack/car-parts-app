export function formatYearTo(yearTo: number | null | undefined): string {
  if (yearTo === 0) return "Current";
  if (yearTo == null) return "TBA";
  return String(yearTo);
}
