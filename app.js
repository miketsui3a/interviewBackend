const express = require('express')
require('dotenv').config()
const crypto = require('crypto');
const app = express()
const fetch = require('node-fetch');
global.fetch = fetch;

const { toJson } = require('unsplash-js')

const Unsplash = require('unsplash-js').default;

const unsplash = new Unsplash({ accessKey: process.env.UNSPLASHKEY });



app.get('/:keyword', (req, res) => {

    const searchUri = '/api/v1/stock-items/search/';

    const expires = Math.floor(Date.now() / 1000);
    const hmacBuilder = crypto.createHmac('sha256', process.env.STORYBLOCKS_PRIVATEKEY + expires);
    hmacBuilder.update(searchUri);
    const hmac = hmacBuilder.digest('hex');


    const storyblocksUrl = `https://api.graphicstock.com/api/v1/stock-items/search/?keywords=${req.params.keyword}&page=1&num_results=1&APIKEY=${process.env.STORYBLOCKS_PUBLICKEY}&EXPIRES=${expires}&HMAC=${hmac}`

    let unsplashPromise = unsplash.search.photos(req.params.keyword, 1, 1)
    let pixabayPromise = fetch(`https://pixabay.com/api/?key=${process.env.PIXABAYKEY}&q=${req.params.keyword}&image_type=photo&per_page=3`)
    let storyblocksPromise = fetch(storyblocksUrl)
    let data = []

    Promise.all([unsplashPromise.catch(err => { console.log(err) }), pixabayPromise.catch(err => { console.log(err) }), storyblocksPromise.catch(err => { console.log(err) })]).then(files =>
        Promise.all(files.map((promise) => {
            if (promise == null || promise.status!=200) {
                console.log("Something wrong ......")
                data.push([])
            } else if (promise.url.includes("unsplash")) {
                return promise.json().then((photos) => {
                    photos.results.map((photo) => {
                        data.push({
                            image_ID: photo.id,
                            thumbnails: photo.urls.thumb,
                            preview: photo.urls.regular,
                            title: photo.alt_description,
                            source: "unsplash",
                            tags: photo.tags.map(tag => {
                                return tag.title
                            })
                        })
                    })
                })

            } else if (promise.url.includes("pixabay")) {
                return promise.json().then((json) => {
                    json.hits.map((photo) => {
                        data.push({
                            image_ID: photo.id,
                            thumbnails: photo.previewURL,
                            preview: photo.largeImageURL,
                            title: null,
                            source: "pixabay",
                            tags: photo.tags.split(',').map(x => {
                                return x
                            })
                        })
                    })
                })
            } else if (promise.url.includes("graphicstock")) {
                return promise.json().then((json) => {
                    json.info.map((photo) => {
                        data.push({
                            image_ID: photo.id,
                            thumbnails: photo.thumbnail_url,
                            preview: photo.preview_url,
                            title: photo.title,
                            source: "storyblocks",
                            tags: photo.keywords.split(',').map(x => {
                                return x
                            })
                        })
                    })
                })
            }
            return Promise.resolve();
        }))
    ).then(() => {
        res.send(data);
    })


})

app.listen(3000)