const puppeteer = require('puppeteer')
const extractPdf = require('../utils/extract-pdf-encode')
const getSavedDeclarations = require('../utils/get-saved-declarations')
const path = require('path')

const PUPPETEER_OPTS = {
    headless: true,
    // devtools: true,
    ignoreHTTPSErrors: true,
    args: [
        '--start-maximized',
        '--ignore-certificate-errors',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // '--no-treekill',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--lang=ja,en-US;q=0.9,en;q=0.8',
        '--enable-features=NetworkService',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
    ],
}

const URL_INIT = 'https://ptscdecprov.clouda.sat.gob.mx/'

const BTN_FIEL = '#buttonFiel'
const INPUT_CER = '#fileCertificate'
const INPUT_KEY = '#filePrivateKey'
const INPUT_CLAVE = '#privateKeyPassword'
const SUBMIT_LOGIN = '#submit'
const FILE_PATH = path.join(__dirname, `../temp/`)

const SELECT_YEAR_DEC = '#MainContent_wucConsultasDeclaracion_wucDdlEjercicioFiscal_ddlCatalogo'
const BTN_SEARCH_DEC = '#MainContent_btnBuscar'
const TABLE_SEARCH_DEC = '#MainContent_wucConsultasDeclaracion_gvDeclaraciones'

const URL_PDF = 'https://ptscdecprov.clouda.sat.gob.mx/Paginas/'

async function scrapeMensuales(rfc, clave, year) {

    const browser = await puppeteer.launch(PUPPETEER_OPTS);
    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(50000);
    await page.setViewport({ width: 1366, height: 768 });

    try {

        console.log('-> Starting SAT')
        await page.goto(URL_INIT, { waitUntil: ["networkidle0", "domcontentloaded"] })

        await loginWhithFiel(page, rfc, clave)

        await gotToSectionDec(page)
        await searchDec(page, rfc, year, 'dec')
        const dataDec = await collectDataDec(page, rfc, 'dec', year)
        const pdfsEncodeDownloadedDec = await exgtractPdfsDec(page, rfc, dataDec.urlsPdf, 'dec')

        const downloadDec = {
            collectedData: dataDec.collectedData,
            pdfsEncodeDownloaded: pdfsEncodeDownloadedDec
        }

        await page.waitFor(1000)

        await page.close();
        const newPage = await browser.newPage()

        await gotToSectionAcuse(newPage)
        await searchDec(newPage, rfc, year, 'acuse')
        const dataAcuse = await collectDataDec(newPage, rfc, 'acuse', year)
        const pdfsEncodeDownloadedAcuse = await exgtractPdfsDec(newPage, rfc, dataAcuse.urlsPdf, 'acuse')

        const downloadAcuse = {
            collectedData: dataAcuse.collectedData,
            pdfsEncodeDownloaded: pdfsEncodeDownloadedAcuse
        }

        return {
            downloadDec,
            downloadAcuse
        }

    } catch (err) {

        await page.screenshot({ path: `./screenshots/error_${rfc}.png`, fullPage: true })

        console.log('Error: scraper')
        console.log(err)

    } finally {

        // await page.close();
        await browser.close();

    }

}

async function loginWhithFiel(page, rfc, clave) {

    await Promise.all([page.click(BTN_FIEL), page.waitForNavigation({waitUntil: ["networkidle0", "domcontentloaded"]})])

    await page.waitFor(1000)

    console.log('-> Entering credentials')
    const inputCer = await page.$(INPUT_CER)
    await inputCer.uploadFile(FILE_PATH + rfc + '.cer')

    const inputKey = await page.$(INPUT_KEY)
    await inputKey.uploadFile(FILE_PATH + rfc + '.key')

    const inputClave = await page.$(INPUT_CLAVE)
    await inputClave.type(clave, { delay: 30 })

    await Promise.all([
        page.evaluate((SUBMIT_LOGIN) => document.querySelector(SUBMIT_LOGIN).click(), SUBMIT_LOGIN),
        page.waitForNavigation({ waitUntil: ["networkidle0", "domcontentloaded"] }),
        page.waitForSelector('#menu')
    ]);

    console.log('-> Logged in SAT')

    return page

}

async function gotToSectionDec(page) {

    await page.goto('https://ptscdecprov.clouda.sat.gob.mx/Paginas/ConsultaDeclaracion.aspx', { waitUntil: ["networkidle0", "domcontentloaded"] })

    return page

}

async function gotToSectionAcuse(page) {

    await page.goto(' https://ptscdecprov.clouda.sat.gob.mx/Paginas/ReimpresionAcuse.aspx', { waitUntil: ["networkidle0", "domcontentloaded"] })

    return page

}

async function searchDec(page, rfc, year, type) {

    await page.select(SELECT_YEAR_DEC, year)

    console.log('-> Searching declarations', year)

    await Promise.all([
        page.click(BTN_SEARCH_DEC),
        page.waitForSelector(TABLE_SEARCH_DEC, { visible: true }),
    ]);

    await page.screenshot({ path: `./screenshots/evidence_${rfc}_${type}.png`, fullPage: true })

    return page
}

async function collectDataDec(page, rfc, type, year) {

    console.log('-> Collecting data', type)

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

            if(data.operacion != 'No. de Operación')
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
                href
            })

        });
        return links
    })

    // const newIdsLinkDec = await getFilteredDeclarations(idsLinkDec, rfc, year)

    const urlsPdf = await getPdfUrls(page, idsLinkDec, type)

    await page.reload()

    return {
        collectedData,
        urlsPdf
    }


}

async function getFilteredDeclarations(idsLinkDec, rfc, year) {

    const savedDeclarations = await getSavedDeclarations.getSaved(rfc, year)

    let newIdsLinkDec = []
    idsLinkDec.forEach(element => {

        if (!savedDeclarations.includes(element.operacion)) {

            newIdsLinkDec.push(element)
        }

    });

    return newIdsLinkDec

}

async function getPdfUrls(page, idsLinkDec, type) {

    let urlsDec = []
    for (let u = 0; u < idsLinkDec.length; u++) {

        let href = idsLinkDec[u].href
        let operacion = idsLinkDec[u].operacion

        await page.waitFor(2000)

        await page.evaluate('__doPostBack("' + href + '", "")')
        await Promise.all([
            page.waitFor(1000),
            page.waitForSelector('#frameDyP', { visible: true }),
            page.waitFor(1000),
        ])

        let pdf = await page.evaluate('document.querySelector("#frameDyP").getAttribute("src")')
        let pdfSAT = URL_PDF + pdf

        console.log({
            operacion,
            pdf: pdfSAT
        })

        urlsDec.push({
            operacion,
            pdf: pdfSAT

        })

        //  if (urlsDec.length == 1) {
        //     urlsDec.push({
        //         operacion,
        //         pdf: pdfSAT

        //     })
        //     }

        await page.evaluate('document.querySelector("#btnBack").click()')

    }

    return urlsDec

}

async function exgtractPdfsDec(page, rfc, urlsDec, type) {

    var pdfsEncodeDownloaded = []
    var pdfsEncodeDownloadedFailed = []

    await page.waitFor(1000)

    let promises = [];

    for (let p = 0; p < urlsDec.length; p++) {

        let prom = new Promise((resolve, reject) => {
            setTimeout(() => {

                let pdf = urlsDec[p].pdf
                let operacion = urlsDec[p].operacion
                console.log(operacion)
                // console.log(pdf)
                page.setRequestInterception(true)

                page.goto(pdf)

                let requestData = ''
                page.on('request', async (interceptedRequest) => {
                    // console.log(interceptedRequest.url())

                    if (interceptedRequest.method() === "POST") {

                        requestData = interceptedRequest.postData()
                        if (requestData.indexOf('ConsultasDeclaracion') == -1) {

                            console.log('correcto', operacion)

                            let pdfEncode = extractPdf.extract(requestData, operacion, rfc, type)
                            if (pdfEncode) {
                                pdfsEncodeDownloaded.push(`${type}_${rfc}_${operacion}.txt`)

                                resolve(`${type}_${rfc}_${operacion}.txt`)
                            }

                            page.removeAllListeners('request');


                        } else {

                            console.log('err', operacion)
                            pdfsEncodeDownloadedFailed.push(operacion)

                        }

                    }

                    interceptedRequest.continue()


                })

            }, p * 5000);

        }).catch(err => console.log(err))

        promises.push(prom)

    }

    await Promise.all(promises)
        .then(values => {
            console.log('desde promises->', values)
        }).catch(err => console.log(err))



    return pdfsEncodeDownloaded

}


module.exports.scrapeMensuales = scrapeMensuales


