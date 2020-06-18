const TIMEOUT = 5000
const DEFAULT_ATTEMPS = 3

function delay(millis) {
	return new Promise(resolve => setTimeout(resolve, millis))
}

async function retry(fn, retries = DEFAULT_ATTEMPS) {
    console.log('retry')
  
	try {
        console.log('yes')
    	return await fn()
    } catch(error) {
        console.log('no')

    	if(retries === 0) throw error
        return await delay(TIMEOUT).then(() => retry(fn, retries -1))
    }
}


module.exports.retry = retry