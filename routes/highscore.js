const { knex } = require("../db");

const router = require("express-promise-router")();
module.exports = router;

router.get("/highscore", async (req, res) => {
    const columns = [
        {
            title: req.t("highscore.column.name"),
            orderBy: "name",
            orderDir: "asc",
        },
        {
            title: req.t("highscore.column.score"),
            orderBy: "score",
            orderDir: "desc",
        },
        {
            title: req.t("highscore.column.change"),
            orderBy: "score_change",
            orderDir: "desc",
        },
        {
            title: req.t("highscore.column.cnt"),
            orderBy: "count3",
            orderDir: "desc",
        },
        {
            title: req.t("highscore.column.pts"),
            orderBy: "total3",
            orderDir: "desc",
        },
        {
            title: req.t("highscore.column.cnt"),
            orderBy: "count2",
            orderDir: "desc",
        },
        {
            title: req.t("highscore.column.pts"),
            orderBy: "total2",
            orderDir: "desc",
        },
        {
            title: req.t("highscore.column.cnt"),
            orderBy: "count1",
            orderDir: "desc",
        },
        {
            title: req.t("highscore.column.pts"),
            orderBy: "total1",
            orderDir: "desc",
        },
        {
            title: req.t("highscore.column.cnt"),
            orderBy: "count0",
            orderDir: "desc",
        },
        {
            title: "Extra",
            orderBy: "extra_bet_total",
            orderDir: "desc"
        }
    ];

    const orderBy = columns.some((c) => c.orderBy === req.query.order)
        ? req.query.order
        : "score";
    const orderDir = req.query.dir === "asc" ? "asc" : "desc";
    const onlyFriends = req.query.friends === "1";

    const results = await knex.raw(
        `SELECT name, score, score - score_past as score_change, id,
                rank, rank_past, rank_past - rank as rank_change,
                count3, count2, count1, count0,
                total3, total2, total1,
                extra_bet_total,
                id = :id as isme, id in (SELECT to_user_id FROM friend WHERE from_user_id = :id) as isfriend
            FROM highscore ` +
            (onlyFriends
                ? " WHERE id = :id OR id in (SELECT to_user_id FROM friend WHERE from_user_id = :id)"
                : "") +
            " ORDER BY " +
            orderBy +
            " " +
            orderDir +
            ", rank ASC, name ASC",
        { id: req.user ? req.user.id : 0 }
    );

    columns.forEach((m) => {
        m.active = orderBy === m.orderBy;
        if (m.active) {
            m.orderDir = orderDir === "asc" ? "desc" : "asc";
        }
        m.url = `/highscore?order=${m.orderBy}&dir=${m.orderDir}`;
        if (onlyFriends) {
            m.url += "&friends=1";
        }
    });

    res.render("highscore", {
        users: results.rows,
        columns,
        friends: onlyFriends,
        hasFriends: results.rows.some((x) => x.isfriend),
    });
});
