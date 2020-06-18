const express = require('express')
// const scraper = require('./scrapers/nonHeadless')
const scraper = require('./scrapers/headless')
const credentials = require('./utils/get-credentials')
const uploadS3 = require ('./utils/upload-s3');


const app = express();

app.get('/descarga-mensuales/:rfc/:year', async (req, res) => {

    const { rfc, year } = req.params

    try {

        const clave = await credentials.getFiel(rfc)

        const scrapedData = await scraper.scrapeMensuales(rfc, clave, year)

        let uniqueSetDec = []
        if(scrapedData.downloadDec.download.pdfsEncodeDownloaded){

            uniqueSetDec = [... new Set(scrapedData.downloadDec.download.pdfsEncodeDownloaded)]

            // dataPdfS3Dec = await uploadS3.uploadPool(uniqueSetDec)
           
        }

        // console.log('desde index decs->',dataPdfS3Dec)


        let uniqueSetAcuse = []
        if(scrapedData.downloadAcuse.download.pdfsEncodeDownloaded){
            
            uniqueSetAcuse = [... new Set(scrapedData.downloadAcuse.download.pdfsEncodeDownloaded)]

            // dataPdfS3Acuse = await uploadS3.uploadPool(uniqueSetAcuse)
           
        }

        let dataPdfS3Dec, dataPdfS3Acuse
        await Promise.all([
            uploadS3.uploadPool(uniqueSetDec),
            uploadS3.uploadPool(uniqueSetAcuse)
        ]).
        then(function(values) { 
           dataPdfS3Dec = values[0]
           dataPdfS3Acuse = values[1]
        })

        // console.log('desde index acuses->',dataPdfS3Acuse)

        const resp = {
            declaracionesData: scrapedData.downloadDec.collectedData,
            declaracionesS3: dataPdfS3Dec,
            acusesData: scrapedData.downloadAcuse.collectedData,
            acusesS3: dataPdfS3Acuse
        }

        console.log(resp)

        res.status(200).send(JSON.stringify(resp))
        res.end()

    } catch (err) {

        console.log(err)
        res.status(503).send(JSON.stringify(err))

    }

})

app.listen(process.env.PORT || 3000, () => console.log('server on port 3000'))
