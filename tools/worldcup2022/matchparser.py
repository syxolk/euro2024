#!/usr/bin/env python3
import requests
import json


def main():
    res = requests.get(
        "https://api.fifa.com/api/v3/calendar/matches?count=100&idSeason=255711")
    data = res.json()

    teams = []
    types = []
    matches = []

    def add_team(team):
        team_name = team["TeamName"][0]["Description"]
        team_code = team["Abbreviation"]
        fifa_id = team["IdTeam"]

        if any(x["code"] == team_code for x in teams):
            # team is already in list
            return

        teams.append({
            "name": team_name,
            "code": team_code,
            "fifa_id": fifa_id
        })

    def add_type(match):
        if len(match["GroupName"]) > 0:
            name = match["GroupName"][0]["Description"]
            code = name #TODO
        else:
            name = match["StageName"][0]["Description"]
            code = name #TODO

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
        if match["Home"] is None:
            placeholder_home = match["PlaceHolderA"]
            home_team_id = None
        else:
            placeholder_home = None
            home_team_id = get_team_index_by_code(
                match["Home"]["Abbreviation"])

        if match["Away"] is None:
            placeholder_away = match["PlaceHolderB"]
            away_team_id = None
        else:
            placeholder_away = None
            away_team_id = get_team_index_by_code(
                match["Away"]["Abbreviation"])

        if len(match["GroupName"]) > 0:
            match_type_id = get_match_type_index_by_code(
                match["GroupName"][0]["Description"])
        else:
            match_type_id = get_match_type_index_by_code(
                match["StageName"][0]["Description"])

        starts_at = match["Date"]
        fifa_id = match["IdMatch"]

        matches.append({
            "placeholder_home": placeholder_home,
            "placeholder_away": placeholder_away,
            "home_team_id": home_team_id,
            "away_team_id": away_team_id,
            "match_type_id": match_type_id,
            "starts_at": starts_at,
            "fifa_id": fifa_id
        })

    for match in data["Results"]:
        if match["Home"] is not None:
            add_team(match["Home"])
        if match["Away"] is not None:
            add_team(match["Away"])
        add_type(match)

    teams.sort(key=lambda x: x["code"])
    types.sort(key=lambda x: x["code"])

    for match in data["Results"]:
        add_match(match)

    all = {
        "teams": teams,
        "matches": matches,
        "types": types,
    }

    with open("worldcup2022.json", "w") as f:
        json.dump(all, f, indent=4)


if __name__ == "__main__":
    main()
