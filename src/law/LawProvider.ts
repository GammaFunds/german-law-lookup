import type { LawReference, LawSearchResult, LawSection } from "./types";

export interface LawProvider {
  id: string;
  label: string;
  search?(query: string): Promise<LawSearchResult[]>;
  getSection(reference: LawReference): Promise<LawSection | null>;
}

