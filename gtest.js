/* eslint-disable no-plusplus */
/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable prefer-const */
// var HttpServer = requre('http'):
import express from 'express';
import PiCamera from 'pi-camera';
import { Gpio } from 'onoff'; // include onoff to interact with the GPIO

const gtest = express();
const relais = new Gpio(22, 'out'); // use GPIO pin 4, and specify that it is output
const SwOpen = new Gpio(27, 'in', 'falling', { debounceTimeout: 50 }); // use GPIO pin 27 as input, rising
const SwClose = new Gpio(17, 'in', 'falling', { debounceTimeout: 50 }); // use GPIO pin 17 as input, rising
// var SwOpen = new Gpio(27, 'in' ); //use GPIO pin 27 as input, rising
// var SwClose = new Gpio(17, 'in'); //use GPIO pin 17 as input, rising
let SnapLock = 'UNLOCKED';
let counter = 0;
let unex = 0;

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

gtest.set('view engine', 'pug');
gtest.set('views', './view');
let myDoor = new Door();

let myCamera = new PiCamera({
  mode: 'photo',
  output: `${__dirname}/bilder/Door.jpg`,
  width: 640,
  height: 480,
  nopreview: true,
});

function timer() {
  setTimeout(timer, 5000);
  // eslint-disable-next-line no-plusplus
  console.log('5s Timeout ', counter++);
}
console.log('STarte Timer');
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

gtest.use(requestTime);


gtest.get('/do', (req, res, _next) => {
//  var resText =  req.fstate;
  relais.writeSync(1);

  setTimeout(() => {
    relais.writeSync(0);
  }, 200);
  myDoor.State = 'UNDEFINED';
  res.render('do', { title: 'Garage Door', timeInfo: req.requestTime });
});

gtest.get('/', (req, res) => {
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


gtest.listen(3000);
