(function () {
    $("form.extra_bet").each(function () {
        var form = this;

        const maxTeams = parseInt($("input[name=max_teams]", form).val(), 10);

        function updateView() {
            const checkedBoxes = $("input:checkbox:checked", form).length;

            if (checkedBoxes <= maxTeams) {
                $("button[type=submit]", form).prop("disabled", false);
                $(".max-teams-warning", form).addClass("d-none");
            } else {
                $("button[type=submit]", form).prop("disabled", true);
                $(".max-teams-warning", form).removeClass("d-none");
            }
        }

        // Browsers tend to memorize form values -> need to update the view immediately
        updateView();

        $("input:checkbox", form).on("change", function () {
            // update the view whenever a checkbox is clicked
            updateView();
        });
    });
})();
