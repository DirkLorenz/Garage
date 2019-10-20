const fgetSunRS = function getSunRS() {
  let SunRS = {
    SunRise: 'init',
    SunSet: 'init'
  };



  http.get('https://api.sunrise-sunset.org/json?lat=36.7201600&lng=-4.4203400&date=today', (res) => {
    const { statusCode } = res;
    const contentType = res.headers['content-type'];

    let error;
    if (statusCode !== 200) {
      error = new Error('Request Failed.\n' +
        `Status Code: ${statusCode}`);
    } else if (!/^application\/json/.test(contentType)) {
      error = new Error('Invalid content-type.\n' +
        `Expected application/json but received ${contentType}`);
    }
    if (error) {
      console.error(error.message);
      // Consume response data to free up memory
      res.resume();
      return;
    }

    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      try {
        const parsedData = JSON.parse(rawData);
        SunRS.SunRise = parsedData.results.sunrise;
        SunRS.SunSet = parsedData.results.sunset;
        console.log(parsedData);
      } catch (e) {
        console.error(e.message);
      }
    });
  }).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
  });

  return SunRS;

}
export default fgetSunRS;

