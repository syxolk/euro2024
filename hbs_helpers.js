const moment = require("moment-timezone");
const hbs = require("hbs");
const config = require("./config");

module.exports = () => {
    moment.updateLocale("en", {
        calendar: {
            lastDay: "[Yesterday at] H:mm",
            sameDay: "[Today at] H:mm",
            nextDay: "[Tomorrow at] H:mm",
            lastWeek: "[Last] dddd [at] H:mm",
            nextWeek: "dddd [at] H:mm",
            sameElse: "L",
        },
    });

    hbs.registerHelper("asset", function (path) {
        return path;
    });

    hbs.registerHelper("calendar", function (when) {
        return moment.tz(when, config.timezone).format("ddd, MMMM Do, HH:mm");
    });

    hbs.registerHelper("calendarShort", function (when) {
        return moment.tz(when, config.timezone).format("MMM D, HH:mm");
    });

    hbs.registerHelper("formatTime", (when) => {
        return moment.tz(when, config.timezone).format("HH:mm");
    });

    hbs.registerHelper("formatDate", (when) => {
        return moment.tz(when, config.timezone).format("ddd, MMMM Do");
    });

    hbs.registerHelper("newsDate", function (when) {
        return moment.tz(when, config.timezone).calendar();
    });

    hbs.registerHelper("toFixed1", function (number) {
        return Math.round(number * 10) / 10;
    });

    hbs.registerHelper("showGoals", function (goals) {
        return goals === undefined || goals === null ? "-" : goals + "";
    });

    hbs.registerHelper("isZero", function (num) {
        return num === 0 || num === "0";
    });

    hbs.registerHelper("gt0", function (val) {
        return val > 0;
    });

    hbs.registerHelper("lt0", function (val) {
        return val < 0;
    });

    hbs.registerHelper("contains", function (arr, val) {
        if (arr === undefined || arr === null) {
            return false;
        }
        return arr.includes(val);
    });

    hbs.registerHelper({
        eq: function (v1, v2) {
            return v1 === v2;
        },
        ne: function (v1, v2) {
            return v1 !== v2;
        },
        lt: function (v1, v2) {
            return v1 < v2;
        },
        gt: function (v1, v2) {
            return v1 > v2;
        },
        lte: function (v1, v2) {
            return v1 <= v2;
        },
        gte: function (v1, v2) {
            return v1 >= v2;
        },
        not: function (v) {
            return !v;
        },
        and: function () {
            return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
        },
        or: function () {
            return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
        },
    });
};
