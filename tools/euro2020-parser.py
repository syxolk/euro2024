#!/usr/bin/env python3
import requests
import json


def main():
    res = requests.get(
        "https://match.uefa.com/v2/matches?competitionId=3&offset=0&limit=51")
    data = res.json()

    teams = []
    types = []
    matches = []

    def add_team(team):
        if team["typeTeam"] == "PLACEHOLDER":
            # ignore placeholder teams
            return

        team_name = team["translations"]["displayName"]["EN"]
        team_code = team["translations"]["displayTeamCode"]["EN"]
        uefa_id = team["id"]

        if any(x["code"] == team_code for x in teams):
            # team is already in list
            return

        teams.append({
            "name": team_name,
            "code": team_code,
            "uefa_id": uefa_id
        })

    def add_type(match):
        if "group" in match:
            name = match["group"]["translations"]["name"]["EN"]
            code = match["group"]["translations"]["shortName"]["EN"]
        else:
            name = match["round"]["translations"]["name"]["EN"]
            code = match["round"]["translations"]["abbreviation"]["EN"]

        if any(x["code"] == code for x in types):
            # match type is already in list
            return

        types.append({
            "name": name,
            "code": code,
        })

    def get_team_index_by_code(code):
        for index, t in enumerate(teams):
            if t["code"] == code:
                return index
        raise ValueError("Team not found")

    def get_match_type_index_by_code(code):
        for index, t in enumerate(types):
            if t["code"] == code:
                return index
        raise ValueError("Type not found")

    def add_match(match):
        if match["homeTeam"]["typeTeam"] == "PLACEHOLDER":
            placeholder_home = match["homeTeam"]["translations"]["displayName"]["EN"]
            home_team_id = None
        else:
            placeholder_home = None
            home_team_id = get_team_index_by_code(
                match["homeTeam"]["translations"]["displayTeamCode"]["EN"])

        if match["awayTeam"]["typeTeam"] == "PLACEHOLDER":
            placeholder_away = match["awayTeam"]["translations"]["displayName"]["EN"]
            away_team_id = None
        else:
            placeholder_away = None
            away_team_id = get_team_index_by_code(
                match["awayTeam"]["translations"]["displayTeamCode"]["EN"])

        if "group" in match:
            match_type_id = get_match_type_index_by_code(
                match["group"]["translations"]["shortName"]["EN"])
        else:
            match_type_id = get_match_type_index_by_code(
                match["round"]["translations"]["abbreviation"]["EN"])

        starts_at = match["kickOffTime"]["dateTime"]
        uefa_id = match["id"]

        matches.append({
            "placeholder_home": placeholder_home,
            "placeholder_away": placeholder_away,
            "home_team_id": home_team_id,
            "away_team_id": away_team_id,
            "match_type_id": match_type_id,
            "starts_at": starts_at,
            "uefa_id": uefa_id
        })

    for match in data:
        add_team(match["homeTeam"])
        add_team(match["awayTeam"])
        add_type(match)

    teams.sort(key=lambda x: x["code"])
    types.sort(key=lambda x: x["code"])

    for match in data:
        add_match(match)

    all = {
        "teams": teams,
        "matches": matches,
        "types": types,
    }

    with open("euro2020.json", "w") as f:
        json.dump(all, f, indent=4)


if __name__ == "__main__":
    main()
