const instance = require('../models').instance;

module.exports = function(app) {
    app.get('/highscore', function(req, res) {
        const columns = [
            {title: "Name", orderBy: "name", orderDir: "asc"},
            {title: "Score", orderBy: "score", orderDir: "desc"},
            {title: "Matches", orderBy: "count3", orderDir: "desc"},
            {title: "Total", orderBy: "total3", orderDir: "desc"},
            {title: "Matches", orderBy: "count2", orderDir: "desc"},
            {title: "Total", orderBy: "total2", orderDir: "desc"},
            {title: "Matches", orderBy: "count1", orderDir: "desc"},
            {title: "Total", orderBy: "total1", orderDir: "desc"},
            {title: "Matches", orderBy: "count0", orderDir: "desc"},
            {title: "Total", orderBy: "total0", orderDir: "desc"},
        ];

        const orderBy = columns.some((c) => c.orderBy === req.query.order) ? req.query.order : 'score';
        const orderDir = req.query.dir === "asc" ? "asc" : "desc";
        const onlyFriends = req.query.friends === '1';

        instance.query(`SELECT name, score, id,
                count3, count2, count1, count0,
                total3, total2, total1, total0,
            id = $id as isme, id in (SELECT "ToUserId" FROM "Friend" WHERE "FromUserId" = $id) as isfriend,
            user_rank_history(id, 3) as history,
            rank() over (order by score desc) as rank FROM score_table` +
            (onlyFriends ? ' WHERE id = $id OR id in (SELECT "ToUserId" FROM "Friend" WHERE "FromUserId" = $id)' : '') +
            ' ORDER BY ' + orderBy + ' ' + orderDir + ', rank ASC, name ASC',
            {
                type: instance.QueryTypes.SELECT,
                bind: {id: (req.user ? req.user.id : 0)}
            })
        .then(function(results) {
            columns.forEach((m) => {
                m.active = (orderBy === m.orderBy);
                if(m.active) {
                    m.orderDir = orderDir === "asc" ? "desc" : "asc";
                }
                m.url = `/highscore?order=${m.orderBy}&dir=${m.orderDir}`
                if(onlyFriends) {
                    m.url += "&friends=1";
                }
            });

            res.render('highscore', {
                users: results,
                columns,
                friends: onlyFriends,
            });
        });
    });
};
