# video-api
This is a REST API that allows users to get direct HLS streaming URLs. Simply choose between movie or TV show and fill out the required parameters. The API takes a while to resolve as it webscrapes fmovies.ps and then returns the URL it finds.

This was created simply for educational purposes and I am not responsible for misuse.

## Requirements
- `Node.js` v20 or above
- `npm` v10 or above

## Setup
1. Clone the repo and run `npm i`.
2. Download uBlock Origin's chromium [extension](https://github.com/gorhill/uBlock/releases/download/1.58.0/uBlock0_1.58.0.chromium.zip) and unzip it in the folder. Make sure it is named `uBlock0.chromium`.
3. Run the app with `node index.js`.

## Usage
Since this is a REST API, all the calls are done with HTTP.
```
Request a movie based on its name.

GET /movie?name=[name]
```
```
Request a show based on its name, episode number, and season number.

GET /show?name=[name]&season=[season]&episode=[episode]
```

<p color="red">You must be patient with this API as it needs time to webscrape. You should never expect it to resolve quick.</p>