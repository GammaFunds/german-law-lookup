export interface SettingsRefreshTarget {
  display(): void;
  update?: () => void;
}

export interface CacheToggleRefreshResult {
  readonly enableLawSectionCache: boolean;
  readonly ttlDisabled: boolean;
  readonly refreshedVia: "update" | "display";
}

function hasCallableUpdate(
  target: SettingsRefreshTarget,
): target is SettingsRefreshTarget & { update: () => void } {
  return typeof target.update === "function";
}

export async function persistCacheToggleAndRefresh(params: {
  enabled: boolean;
  updateSettings: (patch: { enableLawSectionCache: boolean }) => Promise<void>;
  target: SettingsRefreshTarget;
}): Promise<CacheToggleRefreshResult> {
  await params.updateSettings({ enableLawSectionCache: params.enabled });

  if (hasCallableUpdate(params.target)) {
    params.target.update();
    return {
      enableLawSectionCache: params.enabled,
      ttlDisabled: !params.enabled,
      refreshedVia: "update",
    };
  }

  params.target.display();
  return {
    enableLawSectionCache: params.enabled,
    ttlDisabled: !params.enabled,
    refreshedVia: "display",
  };
}
