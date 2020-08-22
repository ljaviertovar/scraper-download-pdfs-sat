const fs = require('fs')
const path = require('path')
const imageToBase64 = require('image-to-base64')

const getImageBase64 = async (type, rfc) => {

    try {

        let image = ''

        if (type == 'evidence') {

            image = await imageToBase64(path.join(__dirname, `../screenshots/evidence_${rfc}_dec.png`))
                .then((response) => response)
                .catch(
                    (error) => {
                        console.log(error);
                    }
                )

        } else if (type == 'captcha') {

            image = await imageToBase64(path.join(__dirname, `../screenshots/captcha_${rfc}.png`))
                .then((response) => response)
                .catch(
                    (error) => {
                        console.log(error);
                    }
                )

        } else {

            image = await imageToBase64(path.join(__dirname, `../screenshots/error_${rfc}.png`))
                .then((response) => response)
                .catch(
                    (error) => {
                        console.log(error);
                    }
                )

        }

        return image

    } catch (err) {
        console.log('Error: ImageBase64')
        console.log(err)
    }

}

module.exports.getImageBase64 = getImageBase64