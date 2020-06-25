const fs = require('fs')
const path = require('path');
const glob = require("glob")

const clean = async (rfc) => {

    try {

        fs.stat(path.join(__dirname, `../temp/${rfc}.cer`), (err) => {

            if (!err) {
                fs.unlink(path.join(__dirname, `../temp/${rfc}.cer`), (err) => {
                    if (err) {
                        console.error(err)
                        return
                    }
                })
            }
        })

        fs.stat(path.join(__dirname, `../temp/${rfc}.key`), (err) => {

            if (!err) {
                fs.unlink(path.join(__dirname, `../temp/${rfc}.key`), (err) => {
                    if (err) {
                        console.error(err)
                        return
                    }
                })
            }
        })

        fs.stat(path.join(__dirname, `../screenshots/error_${rfc}.png`), (err) => {

            if (!err) {
                fs.unlink(path.join(__dirname, `../screenshots/error_${rfc}.png`), (err) => {
                    if (err) {
                        console.error(err)
                        return
                    }
                })
            }
        })

        fs.stat(path.join(__dirname, `../screenshots/evidence_${rfc}_acuse.png`), (err) => {

            if (!err) {
                fs.unlink(path.join(__dirname, `../screenshots/evidence_${rfc}_acuse.png`), (err) => {
                    if (err) {
                        console.error(err)
                        return
                    }
                })
            }
        })

        fs.stat(path.join(__dirname, `../screenshots/evidence_${rfc}_dec.png`), (err) => {

            if (!err) {
                fs.unlink(path.join(__dirname, `../screenshots/evidence_${rfc}_dec.png`), (err) => {
                    if (err) {
                        console.error(err)
                        return
                    }
                })
            }
        })


        glob(`**/dec_${rfc}_*.txt`, function (err, files) {

            for (const file of files) {

                fs.unlink(file, (err) => {
                    if (err) {
                        console.error(err)
                        return
                    }
                })

            }

        })


        glob(`**/acuse_${rfc}_*.txt`, function (err, files) {

            for (const file of files) {

                fs.unlink(file, (err) => {
                    if (err) {
                        console.error(err)
                        return
                    }
                })

            }

        })


    } catch (err) {
        console.log(err)
    }

}

module.exports.clean = clean 