import { Router } from "express";

import config from "../config";
import adminExtraBetRouter from "./admin_extra_bet";
import adminInvitationsRouter from "./admin_invitations";
import adminRouter from "./admin";
import autoupdateMatchResultRouter from "./autoupdate_match_result";
import autoupdateMatchTeamsRouter from "./autoupdate_match_teams";
import extraBetListRouter from "./extra_bet_list";
import extraBetRouter from "./extra_bet";
import flagsRouter from "./flags";
import friendRouter from "./friend";
import googleRoutes from "./google";
import highscoreRouter from "./highscore";
import introRouter from "./intro";
import liveRouter from "./live";
import loginRouter from "./login";
import middlewaresRouter from "./middlewares";
import matchTypeRouter from "./match_type";
import mybetsRouter from "./mybets";
import passwordRecoveryRouter from "./password_recovery";
import pastRouter from "./past";
import registerRouter from "./register";
import saveBetRouter from "./save_bet";
import settingsRouter from "./settings";
import userRouter from "./user";

const router = Router();

router.use(middlewaresRouter);
router.use(flagsRouter);

router.use(loginRouter);
router.use(registerRouter);
router.use(settingsRouter);
router.use(introRouter);
router.use(userRouter);
router.use(adminRouter);
router.use(adminExtraBetRouter);
router.use(adminInvitationsRouter);
router.use(matchTypeRouter);
router.use(mybetsRouter);
router.use(saveBetRouter);
router.use(liveRouter);
router.use(pastRouter);
router.use(highscoreRouter);
router.use(friendRouter);
router.use(passwordRecoveryRouter);
router.use(autoupdateMatchResultRouter);
router.use(autoupdateMatchTeamsRouter);
router.use(extraBetRouter);
router.use(extraBetListRouter);

if (config.google) {
    googleRoutes(router);
}

router.use((req, res) => {
    res.status(404).render("404");
});

export default router;
