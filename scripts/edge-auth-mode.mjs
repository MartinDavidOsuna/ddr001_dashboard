export function selectEdgeAuthMode({ email, password, refreshToken }) {
  const hasEmail = Boolean(email);
  const hasPassword = Boolean(password);
  const hasRefreshToken = Boolean(refreshToken);

  if (hasEmail !== hasPassword)
    throw new Error("E2E_VIEWER_EMAIL y E2E_VIEWER_PASSWORD deben definirse juntos.");
  if (hasEmail && hasPassword) return "credentials";
  if (hasRefreshToken) return "refresh";
  throw new Error(
    "Define E2E_VIEWER_EMAIL + E2E_VIEWER_PASSWORD o E2E_REFRESH_TOKEN sólo en el proceso actual.",
  );
}
