const router = require("express-promise-router")();

router.get("/intro", function (req, res) {
    res.render("intro");
});

module.exports = router;
