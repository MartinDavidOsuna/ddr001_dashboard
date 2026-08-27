export function matchesGallerySearch(item, searchTerm) {
  const needle = String(searchTerm).toLocaleLowerCase("es-MX");
  return [
    item?.accountNumber,
    item?.technicianName,
    item?.crewName,
    item?.slotLabel,
    item?.slotCode,
  ].some((value) =>
    String(value ?? "")
      .toLocaleLowerCase("es-MX")
      .includes(needle),
  );
}

export function galleryCategoryLabel(category) {
  if (category === "mandatory") return "Obligatoria";
  if (category === "additional") return "Adicional";
  throw new Error("La fotografía E2E tiene una categoría no soportada.");
}

export function galleryStatusLabel(status) {
  return (
    {
      received: "Recibida",
      processing: "Procesando",
      verified: "Verificada",
      rejected: "Rechazada",
      missing: "Faltante",
    }[status] || String(status)
  );
}

export function formatGalleryDate(value) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Hermosillo",
  }).format(new Date(value));
}
