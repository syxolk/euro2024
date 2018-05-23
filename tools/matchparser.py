#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import json

def main():
    html = requests.get("https://www.fifa.com/worldcup/matches/").text
    soup = BeautifulSoup(html, 'html.parser')

    all = {
        "teams": get_teams(soup),
        "matches": get_matches(soup),
        "types": get_types(),
    }

    ko_matches = get_ko_matches(soup)

    with open("worldcup2018.json", "w") as f:
        json.dump(all, f, indent=4)

    with open("worldcup2018-ko-matches.json", "w") as f:
        json.dump(ko_matches, f, indent=4)


def get_teams(soup):
    team_list = soup.select_one(".fi-page-nav__filters-btn ~ ul")
    return [
        {
            "code": x.find("img")["alt"],
            "name": x.text,
        }
        for x in team_list.select("a")
    ]


def get_matches(soup):
    match_list = soup.select("div[data-tab=groupphase] .fi-mu")
    return [
        {
            "home": x.select(".fi-t__nTri")[0].text,
            "away": x.select(".fi-t__nTri")[1].text,
            "when": "2018-{month}-{day}T{time}:00Z".format(
                month=x.select_one(".fi-s__date-HHmm")["data-daymonthutc"][2:],
                day=x.select_one(".fi-s__date-HHmm")["data-daymonthutc"][0:2],
                time=x.select_one(".fi-s__date-HHmm")["data-timeutc"],
            ),
            "type": x.select_one(".fi__info__group").text.split(" ")[1],
        }
        for x in match_list
    ]


def get_ko_matches(soup):
    TYPE_MAPPING = {
        "Round of 16": "R16",
        "Quarter-finals": "QF",
        "Semi-finals": "SF",
        "Play-off for third place": "TP",
        "Final": "FIN",
    }

    match_list = filter(lambda x: x.has_attr("data-id-ifes"), soup.select("div[data-tab=knockoutphase] .fi-mu"))
    return [
        {
            "placeholderHome": x.select(".fi-t__nTri")[0].text,
            "placeholderAway": x.select(".fi-t__nTri")[1].text,
            "when": "2018-{month}-{day}T{time}:00Z".format(
                month=x.select_one(".fi-s__date-HHmm")["data-daymonthutc"][2:],
                day=x.select_one(".fi-s__date-HHmm")["data-daymonthutc"][0:2],
                time=x.select_one(".fi-s__date-HHmm")["data-timeutc"],
            ),
            "type": TYPE_MAPPING[x.parent.select_one(".fi-mu-list__head__date").text.strip()],
        }
        for x in match_list
    ]


def get_types():
    return [
        {"code": "A", "name": "Group A"},
        {"code": "B", "name": "Group B"},
        {"code": "C", "name": "Group C"},
        {"code": "D", "name": "Group D"},
        {"code": "E", "name": "Group E"},
        {"code": "F", "name": "Group F"},
        {"code": "G", "name": "Group G"},
        {"code": "H", "name": "Group H"},
        {"code": "R16", "name": "Round of 16"},
        {"code": "QF", "name": "Quarter-final"},
        {"code": "SF", "name": "Semi-final"},
        {"code": "TP", "name": "Play-off for third place"},
        {"code": "FIN", "name": "Final"},
    ]


if __name__ == "__main__":
    main()
