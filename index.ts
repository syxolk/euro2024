import app from "./app";
import config from "./config";

app.listen(config.httpPort, function () {
    console.log("Visit %s", config.origin);
});
