// const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch')
const atob = require('atob');

// const base64 = require('promise-base64');

const URL_GET_FIEL = 'https://respond.cpavision.mx/api/respond/app/cargaFiel/getFiel.php?rfc=';

const getFiel = async (rfc) => {

    try {
        // const URL_CER_TEMP = path.resolve(__dirname, 'temp') + rfc + '.cer'

        // const URL_CER_TEMP = 'C:/RESPOND/scrappers/declaracionesMensuales/temp/' + rfc + '.cer'
        const URL_CER_TEMP = 'C:/RESPOND/scrappers/declaracionesMensuales/temp/' + rfc + '.cer'
        const URL_KEY_TEMP = 'C:/RESPOND/scrappers/declaracionesMensuales/temp/' + rfc + '.key'

        const response = await fetch(URL_GET_FIEL + rfc)
        const fiel = await response.json();

        const cer = Buffer.from(fiel.cer, 'base64');
        const key = Buffer.from(fiel.key, 'base64');

        const clave = atob(fiel.clave)

        fs.writeFile(URL_CER_TEMP, cer, (err) => {

            if (err) throw err;

            console.log(".cer was created!");
        });

        fs.writeFile(URL_KEY_TEMP, key, (err) => {

            if (err) throw err;

            console.log(".key was created!");
        });

        return clave

    } catch (err) {
        console.log('Error: getFiel ')
        console.log(err)
    }
}


module.exports.getFiel = getFiel