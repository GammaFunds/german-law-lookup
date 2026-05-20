export function canonicalDisplayLawCode(lawCode: string): string {
  return lawCode.trim().toUpperCase() === "STGB" ? "StGB" : lawCode;
}
