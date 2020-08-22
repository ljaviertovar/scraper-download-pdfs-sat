const fetch = require('node-fetch')

const URL_SERVICE_RESPOND = 'https://respond.cpavision.mx/respond/app/declaraciones/modelNew.php';

const getSaved = async (rfc, year, type) => {

    let request = {
        method: 'getDeclaracionesMesualesExistentes',
        rfc,
        ejercicio: year,
        tipo: type
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