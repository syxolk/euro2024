const config = require("../config");
const router = require("express-promise-router")();

router.use(require("./middlewares"));

router.use(require("./login"));
router.use(require("./register"));
router.use(require("./settings"));
router.use(require("./intro"));
router.use(require("./user"));
router.use(require("./admin"));
router.use(require("./mybets"));
router.use(require("./save_bet"));
router.use(require("./live"));
router.use(require("./past"));
router.use(require("./highscore"));
router.use(require("./friend"));

router.use((req, res, next) => {
    res.status(404).render("404");
});

module.exports = router;

// module.exports = function (app) {
//     if(config.facebook) { require('./facebook')(app); }
//     if(config.google) { require('./google')(app); }
//     require('./password_recovery')(app);
// };
