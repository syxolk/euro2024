import hbs from "hbs";

export default function registerHbsHelpers() {
    hbs.registerHelper("asset", function (path: string) {
        return path;
    });

    hbs.registerHelper("flagUrl", function (code: string | null | undefined) {
        if (!code) {
            return "";
        }

        return `/flags/${encodeURIComponent(String(code).toUpperCase())}`;
    });

    hbs.registerHelper("toFixed1", function (number: number) {
        return Math.round(number * 10) / 10;
    });

    hbs.registerHelper(
        "showGoals",
        function (goals: number | null | undefined) {
            return goals === undefined || goals === null ? "-" : goals + "";
        }
    );

    hbs.registerHelper("isZero", function (num: number | string) {
        return num === 0 || num === "0";
    });

    hbs.registerHelper("gt0", function (val: number) {
        return val > 0;
    });

    hbs.registerHelper("lt0", function (val: number) {
        return val < 0;
    });

    hbs.registerHelper(
        "contains",
        function (arr: unknown[] | null | undefined, val: unknown) {
            if (arr === undefined || arr === null) {
                return false;
            }
            return arr.includes(val);
        }
    );

    hbs.registerHelper("eq", function (v1: unknown, v2: unknown) {
        return v1 === v2;
    });

    hbs.registerHelper("ne", function (v1: unknown, v2: unknown) {
        return v1 !== v2;
    });

    hbs.registerHelper(
        "lt",
        function (v1: number | string, v2: number | string) {
            return v1 < v2;
        }
    );

    hbs.registerHelper(
        "gt",
        function (v1: number | string, v2: number | string) {
            return v1 > v2;
        }
    );

    hbs.registerHelper(
        "lte",
        function (v1: number | string, v2: number | string) {
            return v1 <= v2;
        }
    );

    hbs.registerHelper(
        "gte",
        function (v1: number | string, v2: number | string) {
            return v1 >= v2;
        }
    );

    hbs.registerHelper("not", function (v: unknown) {
        return !v;
    });

    hbs.registerHelper("and", function (...args: unknown[]) {
        return args.slice(0, -1).every(Boolean);
    });

    hbs.registerHelper("or", function (...args: unknown[]) {
        return args.slice(0, -1).some(Boolean);
    });
}
