const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(isoDate: string) {
  const parts = dateFormatter.formatToParts(new Date(isoDate));
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts
    .find((part) => part.type === "month")
    ?.value.replace(".", "");
  const year = parts.find((part) => part.type === "year")?.value;

  return `${day} ${month} ${year}`;
}
