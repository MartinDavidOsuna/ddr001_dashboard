export function userDate(value?: string) {
  if (!value) return "Sin actividad";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Hermosillo",
  }).format(new Date(value));
}

export function userInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("es-MX"))
    .join("") || "?";
}
