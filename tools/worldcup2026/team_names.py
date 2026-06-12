#!/usr/bin/env python3
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def fetch_json(url):
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:151.0) Gecko/20100101 Firefox/151.0",
        },
    )

    try:
        with urlopen(request, timeout=30) as res:
            content_type = res.headers.get("content-type", "")
            body = res.read()
    except HTTPError:
        raise
    except URLError as exc:
        raise RuntimeError(f"Failed to fetch FIFA data: {exc}") from exc

    text = body.decode("utf-8", errors="replace")

    if "json" not in content_type.lower():
        body_preview = text[:500].strip()
        raise RuntimeError(
            f"Expected JSON response, got {content_type or 'unknown content type'}: {body_preview}"
        )

    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        body_preview = text[:500].strip()
        raise RuntimeError(
            f"Failed to decode FIFA response as JSON: {body_preview}"
        ) from exc


def main():
    matches_data = fetch_json(
        "https://api.fifa.com/api/v3/calendar/matches?count=200&idSeason=285023&language=de"
    )
    stages_data = fetch_json(
        "https://api.fifa.com/api/v3/stages?idSeason=285023&language=de"
    )

    teams = dict()
    types = []

    def add_type(stage):
        name = stage["Name"][0]["Description"]
        code = name  # TODO

        if any(x["code"] == code for x in types):
            # match type is already in list
            return

        types.append({
            "name": name,
            "code": code,
        })

    def add_team(team):
        team_name = team["TeamName"][0]["Description"]
        team_code = team["Abbreviation"]
        fifa_id = team["IdTeam"]

        if team_code in teams:
            # team is already in list
            return

        teams[team_code] = team_name

    for match in matches_data["Results"]:
        if match["Home"] is not None:
            add_team(match["Home"])
        if match["Away"] is not None:
            add_team(match["Away"])

    for stage in stages_data["Results"]:
        add_type(stage)

    all = {
        "teams": teams,
        "types": types,
    }

    with open("german_team_names.json", "w") as f:
        json.dump(all, f, indent=4)


if __name__ == "__main__":
    main()
