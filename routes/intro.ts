import { Router } from "express";

const router = Router();

router.get("/intro", function (req, res) {
    res.render("intro");
});

export default router;
