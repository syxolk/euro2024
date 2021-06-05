const config = require("../config");
const router = require("express-promise-router")();

router.use(require("./middlewares"));

router.use(require("./login"));
router.use(require("./register"));
router.use(require("./settings"));
router.use(require("./intro"));

router.use((req, res, next) => {
    res.status(404).render("404");
});

module.exports = router;

// module.exports = function (app) {
//     if(config.facebook) { require('./facebook')(app); }
//     if(config.google) { require('./google')(app); }
//     require("./user")(app);
//     require('./save_bet')(app);
//     require('./highscore')(app);
//     require('./live')(app);
//     require('./past')(app);
//     require('./admin')(app);
//     require('./friend')(app);
//     require('./mybets')(app);
//     require('./password_recovery')(app);
// };
