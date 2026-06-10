import config from "./config";

const localDateKeyFormatter = new Intl.DateTimeFormat("en", {
    timeZone: config.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

export function getLocalDateKey(value: string | Date) {
    const parts = localDateKeyFormatter.formatToParts(new Date(value));
    const lookup = Object.fromEntries(
        parts
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value])
    );

    return `${lookup.year}-${lookup.month}-${lookup.day}`;
}
