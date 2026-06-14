document.addEventListener("DOMContentLoaded", function () {
    const csrfInput = document.querySelector("input[name=_csrf]");

    if (!(csrfInput instanceof HTMLInputElement)) {
        return;
    }

    const csrfToken = csrfInput.value;

    document.querySelectorAll(".toggle-friend").forEach((button) => {
        button.addEventListener("click", function () {
            if (!(button instanceof HTMLElement)) {
                return;
            }

            const row = button.parentElement?.parentElement ?? null;
            const friendId = button.dataset.id ?? "";

            if (row === null || friendId === "") {
                return;
            }

            if (row.classList.contains("user-is-friend")) {
                void fetch(`/friend/${friendId}`, {
                    body: new URLSearchParams({ _csrf: csrfToken }),
                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded;charset=UTF-8",
                    },
                    method: "DELETE",
                }).then(function (response) {
                    if (!response.ok) {
                        return;
                    }

                    button.textContent = "\u2795";
                    row.classList.remove("user-is-friend");
                });
            } else {
                void fetch("/friend", {
                    body: new URLSearchParams({
                        id: friendId,
                        _csrf: csrfToken,
                    }),
                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded;charset=UTF-8",
                    },
                    method: "POST",
                }).then(function (response) {
                    if (!response.ok) {
                        return;
                    }

                    button.textContent = "\u2796";
                    row.classList.add("user-is-friend");
                });
            }
        });
    });
});
