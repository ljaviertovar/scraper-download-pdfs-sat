const express = require('express')
const compression = require('compression')

const scraper = require('./scrapers/headless')
const credentials = require('./utils/get-credentials')
// const uploadS3 = require('./utils/upload-s3')
const cleanDisk = require('./utils/clean-disk')
const imageToBase64 = require('./utils/get-image-base64')

const app = express();

app.use(compression({ level: 8 }))

app.get('/descarga-mensuales-masive/:rfc/:year', async (req, res) => {

    const { rfc, year } = req.params
    let response = {
        success: false,
        data: null,
        err: null,
        msg: null,
        evidence: null,
    }

    try {

        // await cleanDisk.clean(rfc)
        const clave = await credentials.getFiel(rfc)

        if (clave) {

            let seed = Date.now();
            console.time(`ScraperTime${seed}_${rfc}_${year}`)
            const scrapedData = await scraper.scrapeMensuales(rfc, clave, year)
            console.timeEnd(`ScraperTime${seed}_${rfc}_${year}`)

            if (scrapedData.success) {

                let evidence = await imageToBase64.getImageBase64('evidence', rfc)

                let data = {
                    declaracionesData: scrapedData.downloadDec.collectedData,
                    declaraciones: scrapedData.downloadDec.pdfsEncodeDownloaded,
                    totalDeclaraciones: scrapedData.downloadDec.pdfsEncodeDownloaded.length,
                    acusesData: scrapedData.downloadAcuse.collectedData,
                    acuses: scrapedData.downloadAcuse.pdfsEncodeDownloaded,
                    totalAcuses: scrapedData.downloadAcuse.pdfsEncodeDownloaded.length
                }

                response.success = true
                response.data = data
                response.msg = scrapedData.msg
                response.evidence = evidence

                res.status(200).send(JSON.stringify(response))

            } else {

                let evidence = await imageToBase64.getImageBase64('error', rfc)

                response.err = scrapedData.err
                response.msg = scrapedData.msg
                response.evidence = evidence

                res.status(500).send(JSON.stringify(response))

            }

            await cleanDisk.clean(rfc)

        } else {

            response.msg = 'Error to get FIEL'

            res.status(400).send(JSON.stringify(response))

        }

    } catch (err) {

        let evidence = await imageToBase64.getImageBase64('error', rfc)

        response.evidence = evidence

        console.log(err)
        res.status(409).send(JSON.stringify(response))

    }

    res.end()

})

// const server = app.listen(process.env.PORT || 3000, '10.0.0.80',() => console.log('server on port 3000'))
const server = app.listen(process.env.PORT || 3001, () => console.log('manual on port 3000'))
server.setTimeout(500000)

