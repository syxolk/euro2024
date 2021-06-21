$(function() {
    var csrfToken = $('input[name=_csrf]').val();

    $('.toggle-friend').on("click", function() {
        var button = $(this);
        var row = button.parent().parent();

        if(row.hasClass("user-is-friend")) {
            $.ajax('/friend/' + button.attr('data-id'), {
                data: { _csrf: csrfToken },
                method: 'DELETE'
            }).done(function() {
                button.text("\u2795");
                row.removeClass('user-is-friend');
            });
        } else {
            $.post('/friend', {
                id: button.attr('data-id'),
                _csrf: csrfToken
            }).done(function() {
                button.text("\u2796");
                row.addClass('user-is-friend');
            });
        }
    });
});
