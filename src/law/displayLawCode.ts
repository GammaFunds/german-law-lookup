const canonicalDisplayLawCodes: Record<string, string> = {
  AKTG: "AktG",
  ARBGG: "ArbGG",
  ASYLG: "AsylG",
  AUFENTHG: "AufenthG",
  BETRVG: "BetrVG",
  BURLG: "BUrlG",
  ESTG: "EStG",
  FAMFG: "FamFG",
  GEWSTG: "GewStG",
  GMBHG: "GmbHG",
  GWG: "GwG",
  INSO: "InsO",
  KSCHG: "KSchG",
  KSTG: "KStG",
  PAUSWG: "PAuswG",
  STAG: "StAG",
  STGB: "StGB",
  STPO: "StPO",
  TZBFG: "TzBfG",
  UMWG: "UmwG",
  USTG: "UStG",
  VWGO: "VwGO",
  VWVFG: "VwVfG",
  WPHG: "WpHG",
};

export function canonicalDisplayLawCode(lawCode: string): string {
  return canonicalDisplayLawCodes[lawCode.trim().toUpperCase()] ?? lawCode;
}
