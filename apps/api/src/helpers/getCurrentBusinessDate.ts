export function getCurrentBusinessDate(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).formatToParts(now);

  const partValues = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return new Date(
    Date.UTC(
      Number(partValues.year),
      Number(partValues.month) - 1,
      Number(partValues.day),
    ),
  );
}
