# video-api
This is a REST API that allows users to get direct HLS streaming URLs. Simply choose between movie or TV show and fill out the required parameters. The API takes a while to resolve as it webscrapes fmovies.ps and then returns the URL it finds.

> [!WARNING]
> This was created simply for educational purposes and I am not responsible for any misuse.

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

- If successful
{
    url: URL,
    name: string,
    info: "This URL is not handled by video-api! This API may break at any time because this URL has been scraped from: https://fmovies.ps"
}

- If failure
{
    error: "Error! Please try again later!" | "Please try a different query! Nothing was found..."
}
```
```
Request a show based on its name, episode number, and season number.

GET /show?name=[name]&season=[season]&episode=[episode]

- If successful
{
    url: URL,
    name: string,
    season: string, // Should always be integer > 0
    episode: string, // Should always be integer > 0
    info: "This URL is not handled by video-api! This API may break at any time because this URL has been scraped from: https://fmovies.ps"
}

- If failure
{
    error: "Error! Please try again later!" | "Please try a different query! Nothing was found..."
}
```
```
Request a list of similar movie/show data from a query/title.

GET /search?query=[title]

- If successful
[
    {
        title: string ("Forrest Gump"),
        type: "TV" | "Movie",
        yearReleased?: string ("1994"), // Only available for Movie type
        duration?: string ("142m"), // Only available for Movie type
        posterImage: URL
    },
    ...
]

- If failure
{
    error: "Error! Please try again later!" | "Please try a different query! Nothing was found..."
}
```

> [!IMPORTANT]
> #### You must be patient with this API as it needs time to webscrape. You should NEVER expect it to resolve quickly.
