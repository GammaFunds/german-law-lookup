import { Plugin } from "obsidian";
import { ProviderRegistry } from "./law/ProviderRegistry";
import { GesetzeImInternetProvider } from "./law/providers/GesetzeImInternetProvider";
import { MockLawProvider } from "./law/providers/MockLawProvider";
import { NeurisLawProvider } from "./law/providers/NeurisLawProvider";
import { LawLookupModal } from "./ui/LawLookupModal";

export default class DeLawPlugin extends Plugin {
  private providerRegistry!: ProviderRegistry;

  onload() {
    this.providerRegistry = new ProviderRegistry([
      new NeurisLawProvider(),
      new GesetzeImInternetProvider(),
      new MockLawProvider(),
    ]);

    this.addCommand({
      id: "deutsches-gesetz-nachschlagen",
      name: "Deutsches Gesetz nachschlagen",
      callback: () => {
        new LawLookupModal(this.app, this.providerRegistry).open();
      },
    });
  }
}
