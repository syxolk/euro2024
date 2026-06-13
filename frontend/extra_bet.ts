document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("form.extra_bet").forEach((form) => {
        const maxTeamsInput = form.querySelector("input[name=max_teams]");

        if (!(maxTeamsInput instanceof HTMLInputElement)) {
            return;
        }

        const maxTeams = Number.parseInt(maxTeamsInput.value, 10);

        function updateView() {
            const checkedBoxes = form.querySelectorAll(
                "input[type=checkbox]:checked"
            ).length;
            const submitButton = form.querySelector("button[type=submit]");
            const warning = form.querySelector(".max-teams-warning");

            if (checkedBoxes <= maxTeams) {
                if (submitButton instanceof HTMLButtonElement) {
                    submitButton.disabled = false;
                }

                warning?.classList.add("d-none");
            } else {
                if (submitButton instanceof HTMLButtonElement) {
                    submitButton.disabled = true;
                }

                warning?.classList.remove("d-none");
            }
        }

        updateView();

        form.querySelectorAll("input[type=checkbox]").forEach((checkbox) => {
            checkbox.addEventListener("change", function () {
                updateView();
            });
        });
    });
});
