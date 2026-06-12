import axios from "axios";
import { FifaApiResponseSchema } from "./schema";

export async function fetchFifaMatchResults() {
    const { data, status } = await axios.get<unknown>(
        "https://api.fifa.com/api/v3/calendar/matches",
        {
            params: {
                count: 200,
                idSeason: 285023,
            },
            headers: {
                Accept: "application/json",
                "User-Agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:151.0) Gecko/20100101 Firefox/151.0",
            },
            timeout: 30000,
        }
    );

    if (status >= 300) {
        throw new Error(`FIFA API request failed with status ${status}`);
    }

    const parseResult = FifaApiResponseSchema.safeParse(data);
    if (!parseResult.success) {
        throw new Error(
            `Invalid response from FIFA API: ${parseResult.error.message}`
        );
    }

    return parseResult.data.Results;
}
