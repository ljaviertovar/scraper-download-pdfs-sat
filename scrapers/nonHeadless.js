const puppeteer = require('puppeteer')

const PUPPETEER_OPTS = {
    headless: false,
    // slowMo: { default: 300, click: 200, keyup: 10 },
    devtools: false,

    args: [
        '--start-maximized',
        '--user-data-dir=C:\\Users\\LuisTovar\\AppData\\Local\\Chromium\\User Data\\Profile 1',
        // '--profile-directory=Profile 1'
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

const URL_PDF = 'https://ptscdecprov.clouda.sat.gob.mx/Paginas/'


const scrapeMensuales = async (rfc, clave, year) => {

    const browser = await puppeteer.launch(PUPPETEER_OPTS);
    const page = await browser.newPage()

    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');

    console.log('-> Starting SAT')
    await page.goto(URL_INIT, { waitUntil: ["networkidle0", "domcontentloaded"] })
    // await page.screenshot({ path: './screenshots/example.png' })

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

        });
        return links
    })

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

        const newPage = await browser.newPage();       
        await newPage.goto(pdfSAT)
        await newPage.waitFor(1000)

        await page.bringToFront();
        await newPage.waitFor(1000)


        urlsDec.push({
            operacion,
            pdf: pdfSAT

        })

        await page.evaluate('document.querySelector("#btnBack").click()')

    }

    // console.log(urlsDec)

    await page.reload()

    // let urlsDecS3 = []
    // for (let p = 0; p < urlsDec.length; p++) {

    //     let pdf = urlsDec[p].pdf
    //     let operacion = urlsDec[p].operacion

    //     let s3 = await fetch(URL_SERVICE + pdf + '&op=' + operacion)
    //         .then(pdfS3 => pdfS3.json())
    //     console.log(s3)
    //     urlsDecS3.push({
    //         operacion,
    //         pdf: s3
    //     })

    // }

    console.log('-> Collected data!!')

    const resp = {
        collectedData,
        urlsDec
    }

    await page.close();
    await browser.close()

    return resp

}


module.exports.scrapeMensuales = scrapeMensuales


