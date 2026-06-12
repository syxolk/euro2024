import { knex } from "../db";

export function localizedNameExpr(
    language: string | undefined,
    tableAlias: string
) {
    if (language?.startsWith("de")) {
        return knex.raw(`coalesce(:table:.name_de, :table:.name)`, {
            table: tableAlias,
        });
    }

    return knex.raw(`:table:.name`, {
        table: tableAlias,
    });
}

export function localizedTeamNameExpr(
    language: string | undefined,
    tableAlias: string
) {
    return localizedNameExpr(language, tableAlias);
}

export function localizedMatchTypeNameExpr(
    language: string | undefined,
    tableAlias: string
) {
    return localizedNameExpr(language, tableAlias);
}

export function localizedExtraBetNameExpr(
    language: string | undefined,
    tableAlias: string
) {
    return localizedNameExpr(language, tableAlias);
}
