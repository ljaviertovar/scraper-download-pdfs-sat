const express = require('express')
// const scraper = require('./scrapers/nonHeadless')
const scraper = require('./scrapers/headless')
const credentials = require('./utils/get-credentials')
const uploadS3 = require ('./utils/upload-s3');
const cleanDisk = require ('./utils/clean-disk');
const fs = require('fs');


const app = express();

app.get('/descarga-mensuales/:rfc/:year', async (req, res) => {

    const { rfc, year } = req.params

    try {

        await cleanDisk.clean(rfc)

        const clave = await credentials.getFiel(rfc)

        const scrapedData = await scraper.scrapeMensuales(rfc, clave, year)

        console.log(scrapedData)

        let uniqueSetDec = []
        if(scrapedData.downloadDec.pdfsEncodeDownloaded){

            uniqueSetDec = [... new Set(scrapedData.downloadDec.pdfsEncodeDownloaded)]

            dataPdfS3Dec = await uploadS3.uploadPool(uniqueSetDec)
           
        }


        let uniqueSetAcuse = []
        if(scrapedData.downloadAcuse.pdfsEncodeDownloaded){
            
            uniqueSetAcuse = [... new Set(scrapedData.downloadAcuse.pdfsEncodeDownloaded)]

            dataPdfS3Acuse = await uploadS3.uploadPool(uniqueSetAcuse)
           
        }

        let evidence = await uploadS3.uploadEvidence(rfc, 1)

        const resp = {
            success: true,
            data: {
            declaracionesData: scrapedData.downloadDec.collectedData,
            declaracionesS3: dataPdfS3Dec,
            acusesData: scrapedData.downloadAcuse.collectedData,
            acusesS3: dataPdfS3Acuse
            },
            evidence
        }


        res.status(200).send(JSON.stringify(resp))
        res.end()

    } catch (err) {

        let errorFile = false 
        fs.stat(path.join(__dirname, `./screenshots/error_${rfc}.png`), function(err) {
            if (!err) {
                errorFile = true
            }
        });

        let evidence
        if(errorFile){
            evidence = await uploadS3.uploadEvidence(rfc, 0)
        } else {
            evidence = null
        }

        const errorResp= {
            success: false,
            data: null,
            evidence
        }

        console.log(err)
        res.status(503).send(JSON.stringify(errorResp))

    }

})

const server = app.listen(process.env.PORT || 3000, () => console.log('server on port 3000'))
server.setTimeout(500000)

