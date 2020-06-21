const fetch = require('node-fetch')

const URL_SERVICE_RESPOND = 'https://respond.cpavision.mx/api/respond/app/declaraciones/modelNew.php';

const getSaved = async (rfc, year) => {

    let request = {
        method: 'getDeclaracionesMesualesExistentes',
        rfc,
        ejercicio: year
    }

    const response = await fetch(URL_SERVICE_RESPOND, {

        method: "post",
        headers: {
            "Content-type": "application/json",
        },
        body: JSON.stringify(request)

    })
    .then(response => response.json())

    return response

}

module.exports.getSaved = getSaved