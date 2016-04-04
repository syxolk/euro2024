function isValidGoal(goal) {
    goal = parseInt(goal);
    return !isNaN(goal) && goal >= 0;
}

$(function() {
    var url = $('input[name=_action]').val();
    var csrfToken = $('input[name=_csrf]').val();

    $('.bet').each(function() {
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

            if(isValidGoal(home) && isValidGoal(away)) {
                delay(function() {
                    inputs.removeClass('autosave-success autosave-error');
                    $.post(url, {
                        _csrf: csrfToken,
                        match: $('input[name=match]', bet).val(),
                        home: home,
                        away: away
                    }).done(function() {
                        inputs.addClass('autosave-success');
                    }).fail(function() {
                        inputs.addClass('autosave-error');
                    });
                }, 500);
            }
        });
    });
});
