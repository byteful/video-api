// Import depends
import express from "express";
import puppeteer from "puppeteer-extra";
import puppeteer_extra_plugin_stealth from "puppeteer-extra-plugin-stealth";

const ublock = new URL('uBlock0.chromium', import.meta.url).toString().substring("file:///".length)
// Initialize stealth plugin for puppeteer to bypass FMovies' detection
const stealth = puppeteer_extra_plugin_stealth();
stealth.enabledEvasions.delete('chrome.runtime');
stealth.enabledEvasions.delete('iframe.contentWindow');
puppeteer.use(stealth);

const app = express();

// Constants and Helpers
const SEARCH_URL = (name) => `https://fmovies.ps/search/${name.replace(/ /g, "-")}`;
const INFO_MSG = "This URL is not handled by video-api! This API may break at any time because this URL has been scraped from: https://fmovies.ps";
const ERROR_MSG = "Error! Please try again later!"
const NOT_FOUND_MSG = "Please try a different query! Nothing was found..."

// Puppeteer browser instance setup
let browser;
startBrowser()
    .then(() => loadExtensions())
    .then(() => test())
    .then(() => console.log("Browser is ready! Now starting API endpoint..."))
    .then(() => app.listen(3000, () => console.log("API is ready!")))
    .catch((e) => console.error(e));
async function startBrowser() {
    browser = await puppeteer.launch({
        headless: 'new',
        devtools: false,
        args: [`--load-extension=${ublock}`]
        // executablePath: '/usr/bin/chromium-browser'
    });
}
async function loadExtensions() {
    const page = await browser.newPage();
    await page.goto("https://google.com")
    await page.waitForTimeout(1000)
    await page.close()
}

// Test function that runs after everything initializes
function test() {
    
}

// API endpoint to get movie URL
app.get("/movie", async (req, res) => {
    let name = req.query.name;
    if (!name) return res.sendStatus(400);

    try {
        let url = await searchMovie(name)

        if (!url) {
            res.status(404).send({
                error: NOT_FOUND_MSG
            })
            return
        }

        res.status(200).send({
            url,
            name,
            info: INFO_MSG
        })
    } catch (ignored) {
        res.status(500).send({error: ERROR_MSG})
    }
});

// API endpoint to get show URL
app.get("/show", async (req, res) => {
    let name = req.query.name;
    let season = req.query.season;
    let episode = req.query.episode;
    if (!name || !season || !episode || !isValidNumber(season) || !isValidNumber(episode)) return res.sendStatus(400);

    try {
        let url = await searchShow(name, season, episode)

        if (!url) {
            res.status(404).send({
                error: NOT_FOUND_MSG
            })
            return
        }

        res.status(200).send({
            url,
            name,
            season,
            episode,
            info: INFO_MSG
        })
    } catch (ignored) {
        res.status(500).send({error: ERROR_MSG})
    }
});

// API endpoint to get search results
app.get("/search", async (req, res) => {
    let query = req.query.query;
    if (!query) return res.sendStatus(400);

    try {
        let data = await search(query)

        res.status(200).send(data)
    } catch (ignored) {
        res.status(500).send({error: ERROR_MSG})
    }
})

// Helper method for validating episode and season inputs
function isValidNumber(n) {
    return !isNaN(parseInt(n)) && isFinite(n);
}

// Method to return search results based on a query
async function search(query) {
    const page = await browser.newPage();
    await injectPageCleaner(page);
    await page.goto(SEARCH_URL(query));

    // Web scraper logic from reverse engineering fmovies.ps
    await page.waitForSelector(".film_list-wrap");
    return await page.evaluate(() => 
        Array.from(document.querySelector(".film_list-wrap").children)
            .map(x => {
                let title = x.querySelector(".film-detail > .film-name > a")?.getAttribute("title")
                if (!title) return null;

                let type = x.querySelector(".film-detail > .fd-infor > .fdi-type")?.innerText
                let posterImage = x.querySelector(".film-poster > img")?.getAttribute("src")

                if (type === "TV") {
                    return {title, type, posterImage}
                } else if (type === "Movie") {
                    let yearReleased = x.querySelector(".film-detail > .fd-infor > .fdi-item")?.innerText
                    let duration = x.querySelector(".film-detail > .fd-infor > .fdi-duration")?.innerText

                    return {title, yearReleased, duration, type, posterImage}
                }
            })
            .filter(x => x !== null && x !== undefined)
            .filter((movie, index, self) => 
                index === self.findIndex((m) => m.title === movie.title)
            )
    );
}

// Method to return a URL (or error) for a movie based on its exact name.
async function searchMovie(name) {
    const page = await browser.newPage();
    await injectPageCleaner(page);
    await page.goto(SEARCH_URL(name));
    name = name.toLowerCase();

    // Web scraper logic from reverse engineering fmovies.ps
    await page.waitForSelector(".film_list-wrap");
    let titles = await page.evaluate(() => Array.from(document.querySelector(".film_list-wrap").children).filter(x => x.querySelector(".fdi-type")?.innerText === "Movie").map(x => x.querySelector(".film-detail > .film-name > a")?.getAttribute("title")).filter(x => x !== null && x !== undefined).map(x => x.toLowerCase()));
    if (!titles.includes(name)) return null;

    await page.evaluate((name) => {
        let list = Array.from(document.querySelector(".film_list-wrap").children)
        for (let movie of list) {
            let hook = movie.querySelector(".film-detail > .film-name > a")
            if (hook && hook.getAttribute("title").toLowerCase() === name) {
                hook.click();
                return
            }
        }
    }, name);
    await page.waitForNavigation()
    let playButton = await page.waitForSelector("#content-episodes > div.server-select > ul > li:nth-child(2) > a")
    await playButton.click();

    let url = await injectGrabber(page)
    await page.close();
    return url
}


// Method to return a URL (or error) for a show based on its exact name, season number, and episode number.
async function searchShow(name, season, episode) {
    const page = await browser.newPage();
    await injectPageCleaner(page);
    await page.goto(SEARCH_URL(name));
    name = name.toLowerCase();

    // Web scraper logic from reverse engineering fmovies.ps
    await page.waitForSelector(".film_list-wrap");
    let titles = await page.evaluate(() => Array.from(document.querySelector(".film_list-wrap").children).filter(x => x.querySelector(".fdi-type")?.innerText === "TV").map(x => x.querySelector(".film-detail > .film-name > a")?.getAttribute("title")).filter(x => x !== null && x !== undefined).map(x => x.toLowerCase()));
    if (!titles.includes(name)) return null;

    await page.evaluate((name) => {
        let list = Array.from(document.querySelector(".film_list-wrap").children)
        for (let show of list) {
            let hook = show.querySelector(".film-detail > .film-name > a")
            if (hook && hook.getAttribute("title").toLowerCase() === name) {
                hook.click();
                return
            }
        }
    }, name);
    await page.waitForNavigation()

    await page.waitForSelector("#content-episodes > div > div > div.slc-eps > div.sl-title > div > div")
    let foundSeason = await page.evaluate((season) => {
        let list = Array.from(document.querySelector("#content-episodes > div > div > div.slc-eps > div.sl-title > div > div").children)
        for (let seasonInfo of list) {
            if (seasonInfo && seasonInfo.textContent.endsWith(season)) {
                seasonInfo.click()
                return true
            }
        }

        return false
    }, "" + season);

    if (!foundSeason) return null;

    await page.waitForSelector('.tab-content > .active > ul')
    let foundEpisode = await page.evaluate(episode => {
        let list = Array.from(document.querySelector('.tab-content > .active > ul').children)
        for (let episodeInfo of list) {
            let hook = episodeInfo.querySelector("a")
            if (hook && hook.getAttribute("title").startsWith("Eps " + episode + ":")) {
                hook.click();
                return true;
            }
        }

        return false;
    }, "" + episode)

    if (!foundEpisode) return null;

    await page.waitForNavigation()
    let serverButton = await page.waitForSelector(".server-select > ul > li:nth-child(2) > a")
    await serverButton.click();
    await page.waitForTimeout(500)

    let url = await injectGrabber(page)
    await page.close()
    return url
}

// Injects a request listener into the page and prevents any devtools detectors and unnecessary visual content.
async function injectPageCleaner(page) {
    await page.setRequestInterception(true);
    page.on("request", r => {
        if (r.url().includes("devtool")) {
            r.abort();
            return
        }
        r.continue()
    });
}

// Injects a request listener into the page to grab the m3u8 URL.
function injectGrabber(page) {
    return new Promise((resolve) => {
        page.on("request", r => {
            if(r.url().includes("index.m3u8")) {
                resolve(r.url())
            }
        });
    })
}