/**
 * After signing in, the app returns people to the page named in `?next=`.
 * That value comes from the URL, so anyone can put anything in it. Only a
 * path inside this site is accepted; otherwise a crafted link could send a
 * freshly signed-in user to another website (an "open redirect").
 */
export function safeNextPath(next: string | null | undefined): string {
  const isInternalPath =
    typeof next === "string" &&
    next.startsWith("/") &&
    // "//host" and "/\host" are treated by browsers as other websites.
    !next.startsWith("//") &&
    !next.startsWith("/\\");

  return isInternalPath ? next : "/";
}
