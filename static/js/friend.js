$(function() {
    var csrfToken = $('input[name=_csrf]').val();

    $('.add-friend').click(function() {
        var button = $(this);
        var otherButton = button.next();
        var row = button.parent().parent();

        $.post('/friend', {
            id: button.attr('data-id'),
            _csrf: csrfToken
        }).done(function() {
            button.prop('disabled', true);
            otherButton.prop('disabled', false);
            row.addClass('user-is-friend');
        });
    });

    $('.remove-friend').click(function() {
        var button = $(this);
        var otherButton = button.prev();
        var row = button.parent().parent();

        $.ajax('/friend/' + button.attr('data-id'), {
            data: { _csrf: csrfToken },
            method: 'DELETE'
        }).done(function() {
            button.prop('disabled', true);
            otherButton.prop('disabled', false);
            row.removeClass('user-is-friend');
        });
    });
});
