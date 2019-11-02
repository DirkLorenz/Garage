const nodemailer = require('nodemailer');
const express = require('express');
const PiCamera = require('pi-camera');
const Request = require('request');
const Gpio = require('onoff').Gpio; // include onoff to interact with the GPIO
const garage = express();
const relais = new Gpio(22, 'out'); // use GPIO pin 4, and specify that it is output
const SwOpen = new Gpio(27, 'in', 'falling', { debounceTimeout: 50 }); // use GPIO pin 27 as input, rising
const SwClose = new Gpio(17, 'in', 'falling', { debounceTimeout: 50 }); // use GPIO pin 17 as input, rising
// var SwOpen = new Gpio(27, 'in' ); //use GPIO pin 27 as input, rising
// var SwClose = new Gpio(17, 'in'); //use GPIO pin 17 as input, rising
let SnapLock = 'UNLOCKED';
let counter = 0;
let unex = 0;
let WiederHolung = 0;

let SunRS = {
    SunRise: 'init',
    SunSet: 'init'
  }

const maillist = [
    'dirk.lorenz2404@gmail.com',
    'margarita.m.lorenz@gmail.com',
  ];
  

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
           user: 'dirk.lorenz2404@gmail.com',
           pass: 'slre&-392'
       }
   });
const mailOptions = {
      from: 'dirk.lorenz2404@gmail.com',
      to: maillist,
      subject: '"!Es ist Dunkel und das Garagentoor ist offen!!!"',
      text: 'Hallo,\n\
      Bitte das Garagentoor schließen!\n\
      http://192.168.178.33:3000\n\
      Danke'
    };

class Door {
  constructor() {
    this.State = 'UNDEFINED';
    this.Text = '';
  }

  GetState() {
    let valueOpen;
    let valueClose;
    valueOpen = SwOpen.readSync();
    valueClose = SwClose.readSync();
    if ((valueClose === 0) && (valueOpen === 1)) {
      this.State = 'CLOSED';
    }
    if ((valueOpen === 0) && (valueClose === 1)) {
      this.State = 'OPEN';
    }
    if ((valueOpen === 0) && (valueClose === 0)) {
      this.State = 'UNDEFINED';
    }
    if ((valueOpen === 1) && (valueClose === 1)) {
      this.State = 'UNDEFINED';
    }
  }

  SetText() {
    if (this.State === 'UNDEFINED') {
      this.Text = 'http://192.168.178.33:8080/DoorMoving.png';
    }
    if (this.State === 'OPEN') {
      this.Text = 'http://192.168.178.33:8080/DoorOpen.png';
    }
    if (this.State === 'CLOSED') {
      this.Text = 'http://192.168.178.33:8080/DoorClose.png';
    }
  }
}

garage.set('view engine', 'pug');
garage.set('views', './view');
let myDoor = new Door();

let myCamera = new PiCamera({
  mode: 'photo',
  output: `${__dirname}/bilder/Door.jpg`,
  width: 640,
  height: 480,
  nopreview: true,
});

function timer() {
  setTimeout(timer, 30000);
  // eslint-disable-next-line no-plusplus
  Request.get('http://api.sunrise-sunset.org/json?lat=48.602720&lng=9.098709&date=today&formatted=0', (error, response, body) => {
    if (error) {
      return console.dir(error)
    }
    const parsedData = JSON.parse(body)
    SunRS.SunRise = new Date(parsedData.results.sunrise)
    SunRS.SunSet = new Date(parsedData.results.sunset)
    console.log(SunRS.SunRise)
    console.log(new Date())
    console.log(SunRS.SunSet)
    var now = new Date()
    if ((SunRS.SunRise <= now) && (SunRS.SunSet >= now)) {
      console.log('No Mail')
    } else {
        if((myDoor.State = 'OPEN') && (++WiederHolung % 10 === 0)) {
            WiederHolung = 0;
            console.log('send Mail');
            transporter.sendMail(mailOptions, function (err, info) {
            if(err)
                console.log(err)
            else
                console.log(info);
            });
        }
            
      console.log('Mail',WiederHolung);
    }
  });
  console.log('30s Timeout ', counter++);
  }

console.log('Starte Timer');
timer();

SwOpen.watch((err, _value) => { // Watch for hardware interrupts on pushButton GPIO
  if (err) { // if an error
    console.error('There was an error', err); // output error message to console
    return;
  }
  console.log('SwOpen');
  myDoor.State = 'OPEN';
});

SwClose.watch((err, _value) => { // Watch for hardware interrupts on pushButton GPIO
  if (err) { // if an error
    console.error('There was an error', err); // output error message to console
    return;
  }
  myDoor.State = 'CLOSED';
  console.log('SwClose');
});

function unexportOnClose() { // function to run when exiting program
  if (unex++ === 0) {
    relais.unexport(); // Unexport LED GPIO to free resources
    console.log('unexport relais');
    SwOpen.unexport(); // Unexport Button GPIO to free resources
    console.log('unexport SwOpen');
    SwClose.unexport();
    console.log('unexport SwClose');
    process.exit(0);
  }
  process.exit(1);
}


process.on('SIGINT', unexportOnClose); // function to run when user closes using ctrl+c


// eslint-disable-next-line func-names
let requestTime = function (req, _res, next) {
  let rtime = Date(Date.now());
  req.requestTime = rtime.toString();
  console.log(req.requestTime);
  next();
};


// gtest.use('/do');

garage.use(requestTime);


garage.get('/do', (req, res, _next) => {
//  var resText =  req.fstate;
  relais.writeSync(1);

  setTimeout(() => {
    relais.writeSync(0);
  }, 200);
  myDoor.State = 'UNDEFINED';
  res.render('do', { title: 'Garage Door', timeInfo: req.requestTime });
});

garage.get('/', (req, res) => {
//    resText =  req.fstate;
  if (myDoor.State === 'UNDEFINED') {
    myDoor.GetState();
  }
  myDoor.SetText();
  if (SnapLock !== 'LOCK') {
    SnapLock = 'LOCK';
    myCamera.snap()
      .then((result) => {
        console.log('Bild aufgenommen', result);// Your picture was captured
      })
      .catch((error) => {
        console.log('kein Bild aufgenommen', error);// Your picture was captured
        // Handle your error
      });
    SnapLock = 'UNLOCKED';
  }
  res.render('index', { bild: myDoor.Text, timeInfo: req.requestTime });
});


garage.listen(3000);
