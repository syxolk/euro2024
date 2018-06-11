$(function() {
    var isInteger = function(value) {
        return typeof value === "number" &&
            isFinite(value) &&
            Math.floor(value) === value;
    };
    var isValidGoal = function(goal) {
        return isInteger(parseInt(goal));
    };
    var isValidInput = function(home, away) {
        return (home === "" && away === "") || (isValidGoal(home) && isValidGoal(away));
    };

    var url = $('input[name=_action]').val();
    var csrfToken = $('input[name=_csrf]').val();

    $('.autosave').each(function() {
        var bet = this;
        var delay = (function() {
            var timer = 0;
            return function(callback, ms) {
                clearTimeout(timer);
                timer = setTimeout(callback, ms);
            };
        })();

        $('input', bet).on('input', function() {
            var home = $('input[name=home]', bet).val();
            var away = $('input[name=away]', bet).val();
            var inputs = $('input[name=home], input[name=away]', bet);

            if(isValidInput(home, away)) {
                delay(function() {
                    inputs.removeClass('autosave-success autosave-error');
                    $.post(url, {
                        _csrf: csrfToken,
                        match: $('input[name=match]', bet).val(),
                        home: home,
                        away: away
                    }).done(function() {
                        inputs.removeClass("not-betted");
                        inputs.addClass('autosave-success');
                    }).fail(function() {
                        inputs.addClass('autosave-error');
                    });
                }, 500);
            }
        });
    });
});
