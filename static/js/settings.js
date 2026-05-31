document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("copyInviteLinkBtn");
    if (!btn) return;
    var originalText = btn.textContent;
    btn.addEventListener("click", function () {
        var input = document.getElementById("inviteLinkInput");
        if (!input) return;
        navigator.clipboard.writeText(input.value).then(function () {
            btn.textContent = "✓ Copied!";
            btn.classList.add("btn-success");
            btn.classList.remove("btn-outline-secondary");
            setTimeout(function () {
                btn.textContent = originalText;
                btn.classList.remove("btn-success");
                btn.classList.add("btn-outline-secondary");
            }, 2000);
        });
    });
});
