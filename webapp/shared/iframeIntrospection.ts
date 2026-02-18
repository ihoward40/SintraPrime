export function shouldAttemptIframeIntrospection(
  url: string,
  appOrigin: string
): boolean {
  try {
    return new URL(url).origin === appOrigin;
  } catch {
    return false;
  }
}
