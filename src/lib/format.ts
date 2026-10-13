const timeFormat = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dateTimeFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "8:42 pm", in the viewer's own time zone. */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

/** "1 Mar, 8:42 pm", in the viewer's own time zone. */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** The last six characters of an id, as a short reference people can read out. */
export function shortOrderNumber(orderId: string): string {
  return `#${orderId.slice(-6).toUpperCase()}`;
}
