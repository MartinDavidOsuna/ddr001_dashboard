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
