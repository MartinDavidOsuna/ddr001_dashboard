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

export function assertSupportedAdministrativeRole(role) {
  if (role === "viewer" || role === "admin") return role;
  throw new Error("La sesión E2E tiene un rol administrativo no soportado.");
}
