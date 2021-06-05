const config = require("../config");
const { knex } = require("../db");

const router = require("express-promise-router")();

router.get("/settings", (req, res) => {
    if (!req.user) {
        res.redirect("/login");
        return;
    }

    res.render("settings", {
        enabledFacebook: !!config.facebook,
        enabledGoogle: !!config.google,
        error: req.flash("error"),
    });
});

router.post("/settings", async (req, res) => {
    if (!req.user) {
        res.redirect("/login");
        return;
    }

    await knex("user_account")
        .update({
            // Remove any leading/trailing whitespace
            name: req.body.name.trim(),
        })
        .where({ id: req.user.id });

    res.redirect("/settings");
});

module.exports = router;
