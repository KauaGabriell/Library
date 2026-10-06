export function getCurrentBusinessYear(): number {
  return Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );
}
