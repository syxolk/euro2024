const router = require("express").Router();

router.get("/intro", function (req, res) {
    res.render("intro");
});

module.exports = router;
