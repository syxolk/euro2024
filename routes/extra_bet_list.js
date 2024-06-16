const { knex } = require("../db");

const router = require("express-promise-router")();
module.exports = router;

router.get("/extra_bet_list", async (req, res) => {
    const query = knex("extra_bet")
        .select(
            "id",
            "name",
            "number_of_teams as numberOfTeams",
            "score_factor as scoreFactor",
            knex.raw(
                `
            (
                select array_agg(row_to_json(grouped_team))
                from (
                    select (
                        select jsonb_build_object(
                            'id', team.id,
                            'name', team.name
                        )
                        from team
                        where team.id = t.id
                    ) as "team", array_agg(jsonb_build_object(
                        'id', user_account.id,
                        'name', user_account.name,
                        'isFriend', :friendCheck,
                        'isMe', :meCheck
                    )) as "users", count(*) as "userCount"
                    from user_account_extra_bet
                    cross join unnest(selected_team_ids) as t(id)
                    join user_account on (user_account_extra_bet.user_id = user_account.id)
                    where user_account_extra_bet.extra_bet_id = extra_bet.id
                    group by t.id
                    order by count(*) desc
                ) grouped_team
            ) as teams
            `,
                {
                    friendCheck: req.user
                        ? knex.raw(
                              `
                            (exists (
                                select 1
                                from friend
                                where from_user_id = :userId
                                and to_user_id = user_account.id
                            ))
                        `,
                              { userId: req.user.id }
                          )
                        : knex.raw("false"),
                    meCheck: req.user
                        ? knex.raw("(user_account.id = :userId)", {
                              userId: req.user.id,
                          })
                        : knex.raw("false"),
                }
            )
        )
        .whereRaw("editable_until < now()")
        .orderBy("id");

    const extraBets = await query;

    res.render("extra_bet_list", { extraBets });
});
