const puppeteer = require('puppeteer')
const path = require('path')

const extractPdf = require('../utils/extract-pdf-encode')
const getSavedDeclarations = require('../utils/get-saved-declarations')
const getCaptchaText = require('../utils/get-captcha-text')

const PUPPETEER_OPTS = {
    headless: false,
    ignoreHTTPSErrors: true,
    args: [
        '--start-maximized',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-first-run',
        '--no-sandbox',
        '--no-zygote',
        '--single-process',
    ],
}

const FILE_PATH = path.join(__dirname, `../temp/`)

const URL_INIT = 'https://ptscdecprov.clouda.sat.gob.mx/'

const BTN_FIEL = '#buttonFiel'
const INPUT_CER = '#fileCertificate'
const INPUT_KEY = '#filePrivateKey'
const INPUT_CLAVE = '#privateKeyPassword'
const SUBMIT_LOGIN = '#submit'

const SELECT_YEAR_DEC = '#MainContent_wucConsultasDeclaracion_wucDdlEjercicioFiscal_ddlCatalogo'
const BTN_SEARCH_DEC = '#MainContent_btnBuscar'
const TABLE_SEARCH_DEC = '#MainContent_wucConsultasDeclaracion_gvDeclaraciones'
const SELECT_TYPE_DEC = "#MainContent_wucConsultasDeclaracion_wucDdlDeclaracion_ddlCatalogo"
const VAL_REGION_F = '013'

const BTN_LOGOUT = '#hlSalir'

const URL_PDF = 'https://ptscdecprov.clouda.sat.gob.mx/Paginas/'

async function scrapeMensuales(rfc, clave, year) {

    let response = {
        success: false,
        err: null,
        msg: null,
        downloadDec: null,
        downloadAcuse: null
    }

    const browser = await puppeteer.launch(PUPPETEER_OPTS);
    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(30000);
    await page.setViewport({ width: 1366, height: 768 });

    try {

        console.log('-> Starting SAT')
        await page.goto(URL_INIT, { waitUntil: ["networkidle0", "domcontentloaded"] })

        // await page.screenshot({ path: path.join(__dirname, `../screenshots/captcha_${rfc}.png`), fullPage: true })
        // const captchaText = await getCaptchaText.captchaText(rfc)
        // console.log(captchaText)

        let login = await loginWhithFiel(page, rfc, clave)

        if (login.success) {

            await gotToSectionDec(page)

            await searchDec(page, rfc, year, 'dec')
            const dataDec = await collectDataDec(page, rfc, 'dec', year)
            const pdfsEncodeDownloadedDec = await exgtractPdfsDec(page, rfc, dataDec.urlsPdf, 'dec')

            const downloadDec = {
                collectedData: dataDec.collectedData,
                pdfsEncodeDownloaded: pdfsEncodeDownloadedDec
            }

            const newPage = await browser.newPage()
            await newPage.setViewport({ width: 1366, height: 768 });

            await gotToSectionAcuse(newPage)
            await searchDec(newPage, rfc, year, 'acuse')
            const dataAcuse = await collectDataDec(newPage, rfc, 'acuse', year)
            const pdfsEncodeDownloadedAcuse = await exgtractPdfsDec(newPage, rfc, dataAcuse.urlsPdf, 'acuse')

            const downloadAcuse = {
                collectedData: dataAcuse.collectedData,
                pdfsEncodeDownloaded: pdfsEncodeDownloadedAcuse
            }

            const finalPage = await browser.newPage()
            await gotToSectionAcuse(finalPage)
            await finalPage.click(BTN_LOGOUT)
            await finalPage.waitFor(3000)
            await newPage.close()
            await finalPage.close()

            console.log('-> Data collected')

            response.success = true
            response.downloadAcuse = downloadAcuse
            response.downloadDec = downloadDec
            response.msg = 'Scraping successfully'

        } else {

            await page.screenshot({ path: path.join(__dirname, `../screenshots/error_${rfc}.png`), fullPage: true })

            response.err = 'Error: Error in login'
            response.msg = 'Failed to login'

        }

    } catch (err) {

        await page.screenshot({ path: path.join(__dirname, `../screenshots/error_${rfc}.png`), fullPage: true })

        console.log('Error: scraper')
        console.log(err.message)
        response.err = err.message

        response.msg = 'Scraping error'

    } finally {
        await page.close()
        await browser.close()
    }

    return response

}

async function loginWhithFiel(page, rfc, clave) {

    await Promise.all([
        page.click(BTN_FIEL),
        page.waitForNavigation({ waitUntil: ["networkidle0", "domcontentloaded"] })
    ])

    await page.waitFor(1000)

    console.log(`-> Entering credentials ${rfc}`)
    const inputCer = await page.$(INPUT_CER)
    await inputCer.uploadFile(FILE_PATH + rfc + '.cer')

    const inputKey = await page.$(INPUT_KEY)
    await inputKey.uploadFile(FILE_PATH + rfc + '.key')

    const inputClave = await page.$(INPUT_CLAVE)
    await inputClave.type(clave, { delay: 30 })

    try {

        await Promise.all([
            page.evaluate((SUBMIT_LOGIN) => document.querySelector(SUBMIT_LOGIN).click(), SUBMIT_LOGIN),
            page.waitForNavigation({ waitUntil: ["networkidle0", "domcontentloaded"] }),
            page.waitForSelector('#menu')
        ]);

        // In case of alert, closes it 
        page.on('dialog', dialog => {
            console.log(dialog.message())
            dialog.dismiss()
            page.screenshot({ path: path.join(__dirname, `../screenshots/error_${rfc}.png`), fullPage: true })
        });

        console.log('-> Logged in SAT')

        return {
            success: true
        }

    } catch (err) {

        console.log('-> Error Login')
        return {
            success: false
        }

    }

}

async function closeAlert(page, rfc) {

    let promiseAlert = new Promise((resolve, reject) => {
        // let alert = false
        page.on('dialog', async dialog => {
            console.log(dialog.message());

            alert = true
            let msg = dialog.message()
            await dialog.dismiss()

            // if(alert){
            resolve({
                success: true,
                err: 'Error: Page could not be opened https://ptscdecprov.clouda.sat.gob.mx/Paginas/ConsultaDeclaracion.aspx',
                msg
            })

            await page.screenshot({ path: path.join(__dirname, `../screenshots/error_${rfc}.png`), fullPage: true })
            // } else {
            // reject({
            //     success: false
            // })
            // }
        });
        reject({
            success: false
        })


    })
    let p = promiseAlert
        .then(values => values)
        .catch(err => console.log(err))

    console.log(p)

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

    console.log(`-> Searching ${type} ${year}`)

    await Promise.all([
        page.click(BTN_SEARCH_DEC),
        page.waitForSelector('#MainContent_lblResultado'),
        page.waitFor(2000)
    ])

    const existData = await page.evaluate(() => {

        let el = document.querySelector('#MainContent_lblResultado')

        let exist = false
        if (el.innerText == '') { exist = true }

        return exist

    })

    if (!existData) {

        console.log(`-> Not found ${type}`)

        if (type == 'dec')
            await gotToSectionDec(page)
        else
            await gotToSectionAcuse(page)

        console.log('-> Searching Region F')

        await page.select(SELECT_TYPE_DEC, VAL_REGION_F),

            await Promise.all([
                page.click(BTN_SEARCH_DEC),
                page.waitForSelector(TABLE_SEARCH_DEC, { visible: true }),
            ]);

    }

    await page.screenshot({ path: path.join(__dirname, `../screenshots/evidence_${rfc}_${type}.png`), fullPage: true })

    return page

}

async function collectDataDec(page, rfc, type, year) {

    console.log('-> Collecting data', type)

    const savedDeclarations = await getSavedDeclarations.getSaved(rfc, year, type)

    const collectedData = await page.evaluate((savedDeclarations) => {

        let rows = Array.from(document.querySelectorAll('#MainContent_wucConsultasDeclaracion_gvDeclaraciones > tbody > tr'))

        let dataRows = new Array()
        rows.forEach(row => {

            let columns = Array.from(row.children)
            let dataColumns = new Array()

            columns.forEach(column => {
                dataColumns.push(column.innerText)
            })

            if (!savedDeclarations.includes(dataColumns[0])) {

                let data = {
                    operacion: dataColumns[0],
                    tipoDeDeclaracion: dataColumns[1],
                    tipoDeComplementaria: dataColumns[2],
                    lineaDeCaptura: dataColumns[3],
                    fechaPresentacion: dataColumns[4],
                    periodo: dataColumns[5],
                    cfdi: dataColumns[6],
                }

                if (data.operacion != 'No. de Operación')
                    dataRows.push(data)
            }

        })

        return dataRows
    }, savedDeclarations)

    let urlsPdf = []
    if (collectedData.length > 0) {

        const idsLinkDec = await page.evaluate((savedDeclarations) => {
            let elements = Array.from(document.querySelectorAll("#MainContent_wucConsultasDeclaracion_gvDeclaraciones > tbody > tr > td > a"))

            let links = new Array()
            elements.forEach(element => {
                let href = element.href
                href = href.replace("javascript:__doPostBack('", "")
                href = href.replace("','')", "")

                if (!savedDeclarations.includes(element.innerText.trim())) {
                    links.push({
                        operacion: element.innerText.trim(),
                        id: element.id,
                        href
                    })
                }

            });
            return links
        }, savedDeclarations)

        urlsPdf = await getPdfUrls(page, idsLinkDec)

        await page.reload()

    }

    return {
        collectedData,
        urlsPdf
    }

}

async function getPdfUrls(page, idsLinkDec) {

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

        urlsDec.push({
            operacion,
            pdf: pdfSAT

        })

        await page.evaluate('document.querySelector("#btnBack").click()')

    }

    return urlsDec

}

async function exgtractPdfsDec(page, rfc, urlsDec, type) {

    await page.waitFor(1000)

    let promises = []

    let total = urlsDec.length

    console.log(`Total ${type}: ${total}`)

    for (let p = 0; p < total; p++) {

        let prom = new Promise((resolve, reject) => {
            setTimeout(() => {

                let pdf = urlsDec[p].pdf
                let operacion = urlsDec[p].operacion
                console.log(operacion)

                page.setRequestInterception(true)

                page.goto(pdf)

                let requestData = ''
                page.on('request', async (interceptedRequest) => {

                    if (interceptedRequest.method() === "POST") {

                        requestData = interceptedRequest.postData()
                        if (requestData.indexOf('ConsultasDeclaracion') == -1) {

                            console.log('download', operacion)

                            let pdfEncode = extractPdf.extract(requestData, operacion, rfc, type)

                            let pdfbase64 = {
                                operacion,
                                base64: pdfEncode
                            }

                            page.removeAllListeners('request');
                            resolve(pdfbase64)


                        } else {

                            console.log('err', operacion)

                        }

                    }

                    interceptedRequest.continue()

                })

            }, p * 5000);

        }).catch(err => console.log(err))

        promises.push(prom)

    }

    let pdfsEncodeDownloaded = await Promise.all(promises)
        .then(values => values)
        .catch(err => console.log(err))

    return pdfsEncodeDownloaded

}


module.exports.scrapeMensuales = scrapeMensuales


