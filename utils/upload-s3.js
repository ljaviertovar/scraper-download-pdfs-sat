const fetch = require("node-fetch");
const sha1 = require("sha1");
const fs = require('fs');
const path = require('path');
const atob = require('atob');

const URL_SERVICE =
  "http://internal-cpabase-2031371593.us-east-1.elb.amazonaws.com:8081/s3/upload_file";
const URL_DOWNLOAD_FILE = "https://cpainbox.cpavision.mx/notes/adjuntos/file/";

const uploadEvidence = async (seed, type) => {

  let evidencePath = (type == 1) ? path.join(__dirname, `../screenshots/evidence_${seed}_dec.png`) : path.join(__dirname, `../screenshots/error_${seed}.png`)

  let content = fs.readFileSync(evidencePath, { flag: 'r' }, (err, data) => {

    if (err) throw err;

    return data

  });

  let fileName = sha1(Date.now()) + "_" + seed + ".png"

  let request = {
    bucket: "cparespond",
    nombreArchivo: fileName,
    base64: content.toString('base64')
  }

  const response = await fetch(URL_SERVICE, {
    method: "post",
    headers: {
      "Content-type": "application/json",
    },
    body: JSON.stringify(request)
  }).then(response => response.json())


  return URL_DOWNLOAD_FILE + response.doc.Key;

};

const uploadPool = async (data) => {

  let pdfsS3 = []
  for (var p = 0; p < data.length; p++) {

    console.log('file->',data[p])

    let operation = data[p].split('_')
    operation = operation[2].replace('.txt', '')

    let content = fs.readFileSync(path.join(__dirname, `../temp/${data[p]}`), { flag: 'r' }, (err, data) => {

      if (err) throw err;

      return data

    });


    let fileName = sha1(Date.now() + Math.random()) + "_" + operation + '.pdf'

    let request = {
      bucket: "cparespond",
      nombreArchivo: fileName,
      base64: atob(content.toString('base64'))
    }


    const response = await fetch(URL_SERVICE, {
      method: "post",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify(request)
    }).then(response => response.json())


    pdfsS3.push({
      operacion: operation,
      pdfS3: URL_DOWNLOAD_FILE + response.doc.Key
    })

  }

  return pdfsS3

}


module.exports.uploadEvidence = uploadEvidence
module.exports.uploadPool = uploadPool
