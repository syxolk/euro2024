import config from "../config";
import i18next from "i18next";

export function customI18nFormatting(
    value: unknown,
    format: string | undefined,
    lng: string | undefined
) {
    if (!format) {
        return String(value);
    }

    switch (format) {
        case "appDate":
            return formatDateTime(value, lng, {
                weekday: "short",
                month: "long",
                day: "numeric",
            });
        case "appTime":
            return formatDateTime(value, lng, {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });
        case "appDateTime":
            return formatDateTime(value, lng, {
                weekday: "short",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });
        case "appDateTimeShort":
            return formatDateTime(value, lng, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });
        case "appNewsDate": {
            const { diff, weekday } = getCalendarDayDiff(value, lng ?? null);
            const time = formatDateTime(value, lng, {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });

            if (diff === 0) {
                return i18next.t("format.news_date_today", {
                    lng,
                    time,
                });
            }

            if (diff === 1) {
                return i18next.t("format.news_date_tomorrow", {
                    lng,
                    time,
                });
            }

            if (diff === -1) {
                return i18next.t("format.news_date_yesterday", {
                    lng,
                    time,
                });
            }

            if (diff > 1 && diff < 7) {
                return i18next.t("format.news_date_next_week", {
                    lng,
                    weekday,
                    time,
                });
            }

            if (diff < -1 && diff > -7) {
                return i18next.t("format.news_date_last_week", {
                    lng,
                    weekday,
                    time,
                });
            }

            return formatDateTime(value, lng, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });
        }
        default:
            return String(value);
    }
}

function formatDateTime(
    value: unknown,
    lng: string | undefined,
    options: Intl.DateTimeFormatOptions
) {
    return new Intl.DateTimeFormat(lng ?? "en", {
        timeZone: config.timezone,
        ...options,
    }).format(new Date(value as string | Date));
}

function getCalendarDayDiff(value: unknown, lng: string | null) {
    const nowParts = getZonedDateParts(new Date(), lng);
    const valueParts = getZonedDateParts(value, lng);
    const nowDay = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day);
    const valueDay = Date.UTC(
        valueParts.year,
        valueParts.month - 1,
        valueParts.day
    );

    return {
        diff: Math.round((valueDay - nowDay) / 86400000),
        weekday: valueParts.weekday,
    };
}

function getZonedDateParts(value: unknown, lng: string | null) {
    const parts = new Intl.DateTimeFormat(lng ?? "en", {
        timeZone: config.timezone,
        weekday: "long",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date(value as string | Date));

    const lookup = Object.fromEntries(
        parts
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value])
    );

    return {
        weekday: lookup.weekday,
        year: Number(lookup.year),
        month: Number(lookup.month),
        day: Number(lookup.day),
    };
}
