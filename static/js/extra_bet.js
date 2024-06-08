(function () {
    $("form.extra_bet").each(function () {
        var form = this;

        const maxTeams = parseInt($("input[name=max_teams]", form).val(), 10);

        $("input:checkbox", form).on("change", function () {
            const checkedBoxes = $("input:checkbox:checked", form).length;

            if (checkedBoxes <= maxTeams) {
                $("button[type=submit]", form).prop("disabled", false);
                $(".max-teams-warning", form).addClass("d-none");
            } else {
                $("button[type=submit]", form).prop("disabled", true);
                $(".max-teams-warning", form).removeClass("d-none");
            }
        });
    });
})();
