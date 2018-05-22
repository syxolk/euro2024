const moment = require('moment');
const hbs = require('hbs');

module.exports = () => {
    moment.updateLocale('en', {
        calendar : {
            lastDay : '[Yesterday at] H:mm',
            sameDay : '[Today at] H:mm',
            nextDay : '[Tomorrow at] H:mm',
            lastWeek : '[Last] dddd [at] H:mm',
            nextWeek : 'dddd [at] H:mm',
            sameElse : 'L'
        }
    });

    hbs.registerHelper('asset', function(path) {
        return path;
    });

    hbs.registerHelper('calendar', function(when) {
        return moment(when).format('dddd, MMMM Do, HH:mm');
    });

    hbs.registerHelper('calendarShort', function(when) {
        return moment(when).format('MMM D, HH:mm');
    });

    hbs.registerHelper('newsDate', function(when) {
        return moment(when).calendar();
    });

    hbs.registerHelper('toFixed1', function(number) {
        return Math.round(number * 10) / 10;
    });

    hbs.registerHelper('showGoals', function (goals) {
        return goals === undefined || goals === null ? '-' : goals + '';
    });

    hbs.registerHelper('isZero', function(num) {
        return num === 0 || num === '0';
    });

    hbs.registerHelper('gt0', function(val) {
        return val > 0;
    });

    hbs.registerHelper('lt0', function(val) {
        return val < 0;
    });
};
