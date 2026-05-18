export type AppStoreLinks = {
  readonly appStoreUrl: string;
  readonly googlePlayUrl: string;
};

function readUrl(envKey: string, fallback: string): string {
  const value = process.env[envKey]?.trim();
  return value && value.length > 0 ? value : fallback;
}

/** Public store URLs — override via env in production. */
export function getAppStoreLinks(): AppStoreLinks {
  return {
    appStoreUrl: readUrl(
      "NEXT_PUBLIC_APP_STORE_URL",
      "https://apps.apple.com/app/assist-u-2-win",
    ),
    googlePlayUrl: readUrl(
      "NEXT_PUBLIC_GOOGLE_PLAY_URL",
      "https://play.google.com/store/apps/details?id=com.assistu2win",
    ),
  };
}
