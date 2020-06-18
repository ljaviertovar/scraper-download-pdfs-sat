const decode = require('urldecode')
const atob = require('atob');
const fs = require('fs');

const extract = (pdfEncode, operation, rfc, type) => {

    pdfDecode =  decode(pdfEncode) 
    pdfDecode = pdfDecode.split('&__')
    pdfDecode = pdfDecode[0].replace('__VIEWSTATE=', '')
    pdfDecode = atob(pdfDecode)
    pdfDecode = pdfDecode.replace(/\s+/g, '')

    let pdf = pdfDecode.substr((pdfDecode.indexOf('Base64') + 'Base64'.length + 4))
    pdf = pdf.substr(0, pdf.indexOf('ValidateRequestMode') - 2)

    fs.writeFile(`C:/RESPOND/scrappers/declaracionesMensuales/temp/${type}_${rfc}_${operation}.txt`, pdf, (err) => {

        if (err) throw err;

        console.log(`${type}_${rfc}_${operation}.txt was created!`);
    });

    return  pdf

}




module.exports.extract = extract