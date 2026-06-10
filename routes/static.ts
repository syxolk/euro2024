import crypto from "crypto";
import fs from "fs";
import type { Application } from "express";

const scripts = [
    "./node_modules/jquery/dist/jquery.min.js",
    "./node_modules/bootstrap/dist/js/bootstrap.bundle.min.js",
    "./node_modules/chart.js/dist/chart.min.js",
    "./node_modules/datatables.net/js/jquery.dataTables.min.js",
    "./node_modules/datatables.net-bs5/js/dataTables.bootstrap5.min.js",
];

const styles = [
    "./node_modules/bootstrap/dist/css/bootstrap.min.css",
    "./node_modules/datatables.net-bs5/css/dataTables.bootstrap5.min.css",
];

const vendorJs = scripts
    .map((path) => {
        return fs.readFileSync(path, "utf8");
    })
    .join("\n");
const vendorJsHash = crypto.createHash("sha1").update(vendorJs).digest("hex");
const vendorJsPath = `/static/js/vendor-${vendorJsHash}.js`;

const vendorCss = styles
    .map((path) => {
        return fs.readFileSync(path, "utf8");
    })
    .join("\n");
const vendorCssHash = crypto.createHash("sha1").update(vendorCss).digest("hex");
const vendorCssPath = `/static/css/vendor-${vendorCssHash}.css`;

const tsParticlesConfetti = fs.readFileSync(
    "./node_modules/@tsparticles/confetti/tsparticles.confetti.bundle.min.js",
    "utf8"
);
const tsParticlesConfettiHash = crypto
    .createHash("sha1")
    .update(tsParticlesConfetti)
    .digest("hex");
const tsParticlesConfettiPath = `/static/js/tsparticles-confetti-${tsParticlesConfettiHash}.js`;

export default function registerStaticAssets(app: Application) {
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

    app.locals.tsParticlesConfettiPath = tsParticlesConfettiPath;
    app.get(tsParticlesConfettiPath, (req, res) => {
        res.set("Content-Type", "application/javascript");
        res.set("Cache-Control", "public, max-age=31536000");
        res.send(tsParticlesConfetti);
    });
}
