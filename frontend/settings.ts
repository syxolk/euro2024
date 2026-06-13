document.addEventListener("DOMContentLoaded", function () {
    const button = document.getElementById("copyInviteLinkBtn");

    if (!(button instanceof HTMLButtonElement)) {
        return;
    }

    const originalText = button.textContent;

    button.addEventListener("click", function () {
        const input = document.getElementById("inviteLinkInput");

        if (!(input instanceof HTMLInputElement)) {
            return;
        }

        void navigator.clipboard.writeText(input.value).then(function () {
            button.textContent = "✓ Copied!";
            button.classList.add("btn-success");
            button.classList.remove("btn-outline-secondary");

            window.setTimeout(function () {
                button.textContent = originalText;
                button.classList.remove("btn-success");
                button.classList.add("btn-outline-secondary");
            }, 2000);
        });
    });
});
