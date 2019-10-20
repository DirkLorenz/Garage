const http = require('https');
const getSunRS = require('./mail.js').default;

let SunRS = getSunRS();
console.log('Aufgang :', SunRS.SunRise);
console.log('Untergang :',SunRS.SunSet );
