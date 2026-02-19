export function normalizeGitUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").replace(/\.git$/i, "");
}
