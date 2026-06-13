function isInteger(value: number) {
    return Number.isFinite(value) && Math.floor(value) === value;
}

function isValidGoal(goal: string) {
    return isInteger(Number.parseInt(goal, 10));
}

function isValidInput(home: string, away: string) {
    return (
        (home === "" && away === "") || (isValidGoal(home) && isValidGoal(away))
    );
}

document.addEventListener("DOMContentLoaded", function () {
    const actionInput = document.querySelector("input[name=_action]");
    const csrfInput = document.querySelector("input[name=_csrf]");

    if (
        !(actionInput instanceof HTMLInputElement) ||
        !(csrfInput instanceof HTMLInputElement)
    ) {
        return;
    }

    const url = actionInput.value;
    const csrfToken = csrfInput.value;

    document.querySelectorAll(".autosave").forEach((bet) => {
        let timer = 0;

        function delay(callback: () => void, timeoutMs: number) {
            window.clearTimeout(timer);
            timer = window.setTimeout(callback, timeoutMs);
        }

        bet.querySelectorAll("input").forEach((input) => {
            input.addEventListener("input", function () {
                const homeInput = bet.querySelector("input[name=home]");
                const awayInput = bet.querySelector("input[name=away]");
                const matchInput = bet.querySelector("input[name=match]");

                if (
                    !(homeInput instanceof HTMLInputElement) ||
                    !(awayInput instanceof HTMLInputElement) ||
                    !(matchInput instanceof HTMLInputElement)
                ) {
                    return;
                }

                const home = homeInput.value;
                const away = awayInput.value;
                const inputs = [homeInput, awayInput];

                if (!isValidInput(home, away)) {
                    return;
                }

                delay(function () {
                    inputs.forEach((item) => {
                        item.classList.remove(
                            "autosave-success",
                            "autosave-error"
                        );
                    });

                    void fetch(url, {
                        body: new URLSearchParams({
                            _csrf: csrfToken,
                            away: away,
                            home: home,
                            match: matchInput.value,
                        }),
                        headers: {
                            "Content-Type":
                                "application/x-www-form-urlencoded;charset=UTF-8",
                        },
                        method: "POST",
                    })
                        .then(function (response) {
                            if (!response.ok) {
                                throw new Error("Autosave failed");
                            }

                            inputs.forEach((item) => {
                                item.classList.remove("not-betted");
                                item.classList.add("autosave-success");
                            });
                        })
                        .catch(function () {
                            inputs.forEach((item) => {
                                item.classList.add("autosave-error");
                            });
                        });
                }, 500);
            });
        });
    });
});
