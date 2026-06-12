import { Router } from "express";
import { Request, Response } from "express";

import { knex } from "../db";
import { getUser } from "../request_helper";
import { localizedTeamNameExpr } from "./team_name";

const router = Router();

router.get("/extra_bet_list", async (req: Request, res: Response) => {
    const teamNameExpr = localizedTeamNameExpr(req.language, "team");
    const user = getUser(req);
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
                            'name', ${teamNameExpr},
                            'code', team.code
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
                    friendCheck: user
                        ? knex.raw(
                              `
                            (exists (
                                select 1
                                from friend
                                where from_user_id = :userId
                                and to_user_id = user_account.id
                            ))
                        `,
                              { userId: user.id }
                          )
                        : knex.raw("false"),
                    meCheck: user
                        ? knex.raw("(user_account.id = :userId)", {
                              userId: user.id,
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

export default router;
