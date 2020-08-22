const fetch = require('node-fetch')
const imageToBase64 = require('../utils/get-image-base64');

const URL_SERVICE_CAPTCHA = 'https://respond.cpavision.mx/respond/tools/captcha/index.php'

const captchaText = async (rfc) => {


    let imagePng = await imageToBase64.getImageBase64('captcha', rfc)

    let request = {
        imagen: imagePng,
        x: 100,
        y: 100,
        w: 600,
        h: 480
    }

    console.log(request)

    const response = await fetch(URL_SERVICE_CAPTCHA, {

        method: "post",
        headers: {
            "Content-type": "application/json",
        },
        body: JSON.stringify(request)

    })
        .then(response => response.json())

    return response


}

module.exports.captchaText = captchaText