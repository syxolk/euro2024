const fs = require("node:fs/promises");
const path = require("node:path");
const axios = require("axios");

const router = require("express").Router();
module.exports = router;

const CACHE_DIR = path.join(__dirname, "..", ".cache", "flags");
const CLIENT_CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";
const UPSTREAM_TIMEOUT_MS = 10000;
const VALID_CODE = /^[A-Z]{3}$/;
const UPSTREAM_URL_PREFIX = "https://api.fifa.com/api/v3/picture/flags-sq-1/";

function getCachePaths(code) {
    return {
        image: path.join(CACHE_DIR, `${code}.img`),
        metadata: path.join(CACHE_DIR, `${code}.json`),
    };
}

async function readCachedFlag(code) {
    const cachePaths = getCachePaths(code);
    const [imageBuffer, metadataBuffer] = await Promise.all([
        fs.readFile(cachePaths.image),
        fs.readFile(cachePaths.metadata, "utf8"),
    ]);

    const metadata = JSON.parse(metadataBuffer);
    return {
        buffer: imageBuffer,
        contentType: metadata.contentType,
    };
}

async function writeCachedFlag(code, buffer, contentType) {
    const cachePaths = getCachePaths(code);
    await fs.mkdir(CACHE_DIR, { recursive: true });

    await Promise.all([
        fs.writeFile(cachePaths.image, buffer),
        fs.writeFile(
            cachePaths.metadata,
            JSON.stringify({
                contentType,
                cachedAt: new Date().toISOString(),
            })
        ),
    ]);
}

async function fetchFlag(code) {
    const response = await axios.get(`${UPSTREAM_URL_PREFIX}${code}`, {
        headers: {
            Accept: "image/*",
            "User-Agent": "Mozilla/5.0",
        },
        responseType: "arraybuffer",
        timeout: UPSTREAM_TIMEOUT_MS,
    });

    const contentType = response.headers["content-type"] || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
        throw new Error(`Unexpected flag content type: ${contentType || "unknown"}`);
    }

    return {
        buffer: Buffer.from(response.data),
        contentType,
    };
}

function sendFlag(res, flag) {
    res.set("Cache-Control", CLIENT_CACHE_CONTROL);
    res.type(flag.contentType);
    res.send(flag.buffer);
}

router.get("/flags/:code", async (req, res) => {
    const code = String(req.params.code || "").toUpperCase();
    if (!VALID_CODE.test(code)) {
        res.status(400).json({ error: "invalid flag code" });
        return;
    }

    try {
        const cachedFlag = await readCachedFlag(code);
        sendFlag(res, cachedFlag);
        return;
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error(`Failed to read cached flag ${code}:`, error);
        }
    }

    try {
        const flag = await fetchFlag(code);
        await writeCachedFlag(code, flag.buffer, flag.contentType);
        sendFlag(res, flag);
    } catch (error) {
        const statusCode = error.response?.status;
        if (statusCode === 404) {
            res.status(404).json({ error: "flag not found" });
            return;
        }

        console.error(`Failed to fetch flag ${code}:`, error.message || error);
        res.status(502).json({ error: "flag unavailable" });
    }
});
