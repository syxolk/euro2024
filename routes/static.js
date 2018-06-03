const fs = require("fs");
const crypto = require("crypto");

const scripts = [
    "./node_modules/jquery/dist/jquery.min.js",
    "./node_modules/bootstrap/dist/js/bootstrap.min.js",
    "./node_modules/chart.js/dist/Chart.min.js",
];

const styles = [
    "./node_modules/bootstrap/dist/css/bootstrap.min.css",
];

const vendorJs = scripts.map((path) => {
    return fs.readFileSync(path, "utf8");
}).join("\n");
const vendorJsHash = crypto.createHash("sha1").update(vendorJs).digest("hex");
const vendorJsPath = `/static/js/vendor-${vendorJsHash}.js`;

const vendorCss = styles.map((path) => {
    return fs.readFileSync(path, "utf8");
}).join("\n");
const vendorCssHash = crypto.createHash("sha1").update(vendorCss).digest("hex");
const vendorCssPath = `/static/css/vendor-${vendorCssHash}.css`;

module.exports = (app) => {
    app.locals.vendorJsPath = vendorJsPath;
    app.get(vendorJsPath, (req, res) => {
        res.set("Content-Type", "application/javascript");
        res.set("Cache-Control", "public, max-age=31536000");
        res.send(vendorJs);
    });

    app.locals.vendorCssPath = vendorCssPath;
    app.get(vendorCssPath, (req, res) => {
        res.set("Content-Type", "text/css");
        res.set("Cache-Control", "public, max-age=31536000");
        res.send(vendorCss);
    });
};
