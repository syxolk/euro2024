const config = require("../config");
const router = require("express-promise-router")();

router.use(require("./middlewares"));

router.use(require("./login"));
router.use(require("./register"));
router.use(require("./settings"));
router.use(require("./intro"));
router.use(require("./user"));
router.use(require("./admin"));
router.use(require("./admin_extra_bet"));
router.use(require("./mybets"));
router.use(require("./save_bet"));
router.use(require("./live"));
router.use(require("./past"));
router.use(require("./highscore"));
router.use(require("./friend"));
router.use(require("./password_recovery"));
router.use(require("./autoupdate_match_result"));
router.use(require("./autoupdate_match_teams"));
router.use(require("./extra_bet"));
router.use(require("./extra_bet_list"));

if (config.google) {
    require("./google")(router);
}

router.use((req, res, next) => {
    res.status(404).render("404");
});

module.exports = router;

// module.exports = function (app) {
//     if(config.facebook) { require('./facebook')(app); }
//
// };
