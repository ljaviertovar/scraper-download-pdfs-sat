const puppeteer = require('puppeteer')
// const fs = require('fs');

const extractPdf = require('../utils/extract-pdf-encode')
const uploadS3 = require('../utils/upload-s3');

// // get the reference of EventEmitter class of events module
// const events = require('events');

// //create an object of EventEmitter class by using above reference
// const emitter = new events.EventEmitter();
// emitter.setMaxListeners(100)

const PUPPETEER_OPTS = {
    headless: false,
    devtools: true,
    args: [
        '--start-maximized',
        '--trace-warnings app.js'
    ]
}

const URL_INIT = 'https://ptscdecprov.clouda.sat.gob.mx/'

const BTN_FIEL = '#buttonFiel'
const INPUT_CER = '#fileCertificate'
const INPUT_KEY = '#filePrivateKey'
const INPUT_CLAVE = '#privateKeyPassword'
const SUBMIT_LOGIN = '#submit'
const FILE_PATH = 'C:/RESPOND/scrappers/declaracionesMensuales/temp/'

const DIV_CONSULT = '#MainContent_pnlConsulta'
const SELECT_YEAR_DEC = '#MainContent_wucConsultasDeclaracion_wucDdlEjercicioFiscal_ddlCatalogo'
const BTN_SEARCH_DEC = '#MainContent_btnBuscar'
const TABLE_SEARCH_DEC = '#MainContent_wucConsultasDeclaracion_gvDeclaraciones'

// const URL_PDF = 'https://ptscdecprov.clouda.sat.gob.mx/Paginas/'


const scrapeMensuales = async (rfc, clave, year) => {

    const browser = await puppeteer.launch(PUPPETEER_OPTS);
    const page = await browser.newPage()

    try {

        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');

        // await page._networkManager.setMaxListeners(100)

        console.log('-> Starting SAT')
        await page.goto(URL_INIT, { waitUntil: ["networkidle0", "domcontentloaded"] })


        // await page.setRequestInterception(true)
        // page.on('request', interceptedRequest => { 
        //     if (interceptedRequest.resourceType() === "image") interceptedRequest.abort()
        //     if (interceptedRequest.resourceType() === "png") interceptedRequest.abort()
        //     if (interceptedRequest.resourceType() === "svg") interceptedRequest.abort()
        //     if (interceptedRequest.resourceType() === "font") interceptedRequest.abort()
        //     interceptedRequest.continue()
        // })

        await Promise.all([page.waitForSelector(BTN_FIEL), page.click(BTN_FIEL), page.waitForNavigation()])

        await page.waitFor(1000)

        // LOGIN 
        console.log('-> Entering credentials')
        const inputCer = await page.$(INPUT_CER)
        await inputCer.uploadFile(FILE_PATH + rfc + '.cer')

        const inputKey = await page.$(INPUT_KEY)
        await inputKey.uploadFile(FILE_PATH + rfc + '.key')

        const inputClave = await page.$(INPUT_CLAVE)
        await inputClave.type(clave, { delay: 50 })


        await Promise.all([
            page.evaluate((SUBMIT_LOGIN) => document.querySelector(SUBMIT_LOGIN).click(), SUBMIT_LOGIN),
            page.waitForNavigation({ waitUntil: ["networkidle0", "domcontentloaded"] }),
            page.waitForSelector('#menu')
        ]);

        console.log('-> Logged in SAT')

        await page.evaluate(() => {
            let elements = Array.from(document.querySelectorAll('.ui-menuitem-link'))

            elements.forEach(element => {
                if (element.text.trim() == 'Consulta de la declaración') {
                    element.click()
                }
            });

        })

        await Promise.all([
            page.waitForNavigation({ waitUntil: ["networkidle0", "domcontentloaded"] }),
            page.waitForSelector(DIV_CONSULT),
        ])

        await page.select(SELECT_YEAR_DEC, year)

        console.log('-> Searching declarations', year)

        await Promise.all([
            page.click(BTN_SEARCH_DEC),
            page.waitForSelector(TABLE_SEARCH_DEC, { visible: true })

        ]);

        console.log('-> Collecting data')

        const collectedData = await page.evaluate(() => {

            let rows = Array.from(document.querySelectorAll('#MainContent_wucConsultasDeclaracion_gvDeclaraciones > tbody > tr'))

            let dataRows = new Array()
            rows.forEach(row => {

                let columns = Array.from(row.children)
                let dataColumns = new Array()

                columns.forEach(column => {
                    dataColumns.push(column.innerText)
                })

                let data = {
                    operacion: dataColumns[0],
                    tipoDeDeclaracion: dataColumns[1],
                    tipoDeComplementaria: dataColumns[2],
                    lineaDeCaptura: dataColumns[3],
                    fechaPresentacion: dataColumns[4],
                    periodo: dataColumns[5],
                    cfdi: dataColumns[6],
                }

                dataRows.push(data)

            })

            return dataRows
        })

        const idsLinkDec = await page.evaluate(() => {
            let elements = Array.from(document.querySelectorAll("#MainContent_wucConsultasDeclaracion_gvDeclaraciones > tbody > tr > td > a"))

            let links = new Array()
            elements.forEach(element => {
                let href = element.href
                href = href.replace("javascript:__doPostBack('", "")
                href = href.replace("','')", "")
                links.push({
                    operacion: element.innerText.trim(),
                    id: element.id,
                    href: href
                })

                links.push({
                    operacion: element.innerText.trim(),
                    id: element.id,
                    href: href
                })

            });
            return links
        })

        var pdfsEncodeDownloaded = []
        var pdfsEncodeDownloadedFailed = []
        for (var u = 0; u < idsLinkDec.length; u++) {
            try {
                var href = idsLinkDec[u].href
                var operacion = idsLinkDec[u].operacion

                await page.waitFor(2000)

                await page.evaluate('__doPostBack("' + href + '", "")')

                await page.setRequestInterception(true)

                page.on('request', interceptedRequest => {

                    // page.on('-> Error', msg => {
                    //     page.screenshot({ path: './screenshots/example.png', fullPage: true })
                    //     throw msg;
                    // });

                    if (interceptedRequest.resourceType() === "image") interceptedRequest.abort();
                    if (interceptedRequest.resourceType() === "jpeg") interceptedRequest.abort();
                    if (interceptedRequest.resourceType() === "font") interceptedRequest.abort();
                    if (interceptedRequest.resourceType() === "png") interceptedRequest.abort();
                    if (interceptedRequest.resourceType() === "svg") interceptedRequest.abort();
                    if (interceptedRequest.resourceType() === "gif") interceptedRequest.abort();
                    if (interceptedRequest.resourceType() === "x-icon") interceptedRequest.abort();
                    if (interceptedRequest.resourceType() === "script") interceptedRequest.abort();

                    Promise.resolve(interceptedRequest)
                        .then((interceptedRequest) => {


                            if (interceptedRequest.method() === "POST") {

                                var requestData = interceptedRequest.postData()
                                if (requestData.indexOf('ConsultasDeclaracion') == -1) {

                                    console.log('correcto', operacion)

                                    let pdfEncode = extractPdf.extract(requestData, operacion, rfc)
                                    if (pdfEncode)
                                        pdfsEncodeDownloaded.push(`dec_${rfc}_${operacion}.txt`)

                                } else {

                                    console.log('err', operacion)
                                    pdfsEncodeDownloadedFailed.push(operacion)

                                }

                                page.removeAllListeners('request');

                            }

                            interceptedRequest.continue()

                        })
                        .catch(err => {
                            page.screenshot({ path: './screenshots/example.png', fullPage: true })
                            console.log(err)
                            page.removeAllListeners('request');

                        })


                })

            } catch (err) {
                console.log('<_', err)
            }
        }
        await page.setRequestInterception(false)

        await page.waitFor(1000)

        await page.reload()

        console.log(pdfsEncodeDownloaded)
        console.log(pdfsEncodeDownloadedFailed)

        console.log('-> Collected data!!')

        return {
            collectedData,
            pdfsEncodeDownloadedFailed,
            totalDeclarations: (idsLinkDec.length) / 2
        }

    } catch (err) {

        await page.screenshot({ path: './screenshots/example.png', fullPage: true })

        console.log('Error: scraper')
        console.log(err)

    }

    await page.close();
    await browser.close()

}


module.exports.scrapeMensuales = scrapeMensuales


