export function localizedTeamNameExpr(
    language: string | undefined,
    tableAlias: string
) {
    if (language?.startsWith("de")) {
        return `coalesce(${tableAlias}.name_de, ${tableAlias}.name)`;
    }

    return `${tableAlias}.name`;
}
