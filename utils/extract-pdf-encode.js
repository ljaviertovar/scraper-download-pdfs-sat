const decode = require('urldecode')
const atob = require('atob');
const fs = require('fs');
const path = require('path')

const extract = (pdfEncode, operation, rfc, type) => {

    pdfDecode =  decode(pdfEncode) 
    pdfDecode = pdfDecode.split('&__')
    pdfDecode = pdfDecode[0].replace('__VIEWSTATE=', '')
    pdfDecode = atob(pdfDecode)

    let pdf = pdfDecode.substr((pdfDecode.indexOf('Base64') + 'Base64'.length + 4))
    pdf = pdf.substr(0, pdf.indexOf('ValidateRequestMode') - 2)
    pdf = pdf.replace(/\s+/g, '')

    // fs.writeFile(path.join(__dirname,`../temp/${type}_${rfc}_${operation}.txt`), pdf, (err) => {

    //     if (err) throw err;

    //     console.log(`${type}_${rfc}_${operation}.txt was created!`);
    // });

    return  pdf

}




module.exports.extract = extract