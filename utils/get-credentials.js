// const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch')
const path = require('path');

// const URL_GET_FIEL = 'https://access.cpavision.mx/system/credentialsFiel/';
const URL_GET_FIEL = 'http://10.0.0.74/system/credentialsFiel/';

const getFiel = async (rfc) => {

    try {

        const URL_CER_TEMP = path.join(__dirname, `../temp/${rfc}.cer`)
        const URL_KEY_TEMP = path.join(__dirname, `../temp/${rfc}.key`)

        const response = await fetch(URL_GET_FIEL + rfc)
        const fiel = await response.json();

        const cer = Buffer.from(fiel.cer, 'base64');
        const key = Buffer.from(fiel.key, 'base64');

        const clave = fiel.clave

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