var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var words = require('./words.json');
var fs = require('fs');
var currentWord = "";
var usersOnline = [];
var theDrawer = {username:null, id:null, htmlusername:null};
var brushColor = "#000000";
var brushSize = 10;
var history = [];
var rooms = [{"name":"Room 1","players":0}]
updateRooms();

//Magical numbers
var timeLeft = 91; //in seconds
var minMessageInterval = 200; //in milliseconds
var newDrawerDelay = 1500; //in milliseconds

app.use(express.static(__dirname + '/public'));

let port = process.env.PORT;
if (port == null || port == "") {
  port = 80;
}
http.listen(port, function(){
  console.log('listening on port ' + port);
});

//lower timer every second and check if time is out
setInterval(function(){
  timeLeft -= 1;
  if (timeLeft < 0 && usersOnline.length > 1) {
    io.emit('message', {
      text: 'Time ran out! The word was "' + currentWord + '". Randomizing new drawer...', username:null
    });
    randomizeDrawer();
    io.emit('allowedToDraw', {
      bool:false, word:null, user:theDrawer
    });
    resetBrush();
    randomizeWord();
    setTimeout(function(){
      io.to(theDrawer.id).emit('allowedToDraw', {
        bool:true, word:currentWord, user:theDrawer
      });
      resetCanvas();
      resetTimer();
    }, newDrawerDelay);
  }
}, 1000);

//sync time every 10 s
setInterval(function(){
  io.emit('timeLeft', {time:timeLeft});
}, 10000);

io.on('connection', function(socket){
  var userInfo;
  var messageTimestamp = Date.now();
  socket.emit('init', {brushSize:brushSize, brushColor:brushColor, history: history});
  socket.emit('scoreBoard', usersOnline);
  socket.emit('timeLeft', {time:timeLeft});
  socket.on('connectInfo', function(info){
    userInfo = {
      username:info.username,
      htmlusername:encodeHTML(info.username),
      id:info.id,
      drawerPoints:0,
      guesserPoints:0,
      room:info.room
    };
    var roomToUpdate = rooms.find(roomToAddplayerTo => roomToAddplayerTo.name == info.room);
    if (roomToUpdate != undefined) {
      roomToUpdate.players += 1;
      updateRooms();
    }
    console.log(info.username + ' connected');
    socket.broadcast.emit('message', {
      text: userInfo.htmlusername + ' has connected', username:null
    });
    if (usersOnline.length <= 0){
      randomizeWord();
      theDrawer = userInfo;
      socket.emit('allowedToDraw', {bool:true, word: currentWord, user:theDrawer});
      resetTimer();
    }
    else {
      socket.emit('allowedToDraw', {
        bool:false, word:null, user:theDrawer
      });
    }
    usersOnline.push(userInfo);
    io.emit('scoreBoard', usersOnline);
  });

  socket.on('clearCanvas', (x) => {
    if (userInfo.id == theDrawer.id){
      resetCanvas();
      history.push({color: brushColor, size: brushSize});
    }
  });

  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
      socket.connect();
    }
    else if(userInfo != undefined){
      console.log(userInfo.username + " disconnected");
      var roomToUpdate = rooms.find(roomToAddplayerTo => roomToAddplayerTo.name == userInfo.room);
      if (roomToUpdate != undefined) {
        roomToUpdate.players -= 1;
        updateRooms();
      }
      usersOnline = usersOnline.filter(e => e.id != userInfo.id);
      io.emit('scoreBoard', usersOnline);
      socket.broadcast.emit('message', {
        text: userInfo.htmlusername + ' has disconnected', username:null
      });
      if (userInfo.id == theDrawer.id){
        resetCanvas();
        resetBrush();
        // If there are people left, randomize a new drawer
        if (usersOnline.length > 0){
          randomizeDrawer();
          socket.broadcast.emit('allowedToDraw', {
            bool:false, word:null, user:theDrawer
          });
          resetBrush();
          randomizeWord();
          io.to(theDrawer.id).emit('allowedToDraw', {
            bool:true, word:currentWord, user:theDrawer
          });
          resetTimer();
        }
      }
    }
  });

  socket.on('message', function(message){
    if (userInfo.id != theDrawer.id && Date.now() - messageTimestamp > minMessageInterval){
      text = encodeHTML(message.text);
      socket.broadcast.emit('message', {text:text, username:userInfo.username});
      socket.emit('message', {text:text, username:'You'});
      if (message.text.toLowerCase() == currentWord) {
        io.emit('message', {text:'Correct!', user:null});
        // Give points
        usersOnline.find(user => user.id == theDrawer.id).drawerPoints += 1;
        usersOnline.find(user => user.id == userInfo.id).guesserPoints += 1;
        // change drawer
        theDrawer = userInfo;
        io.emit('scoreBoard', usersOnline);
        socket.broadcast.emit('allowedToDraw', {bool:false, word:null, user:theDrawer});
        randomizeWord();
        setTimeout(function(){
          socket.emit('allowedToDraw', {bool:true, word: currentWord, user:theDrawer});
          resetBrush();
          resetCanvas();
          resetTimer();
        }, newDrawerDelay);
      }
    }
    messageTimestamp = Date.now();
  });

  socket.on('stroke', function(stroke){
    if (userInfo.id == theDrawer.id){
      history.push(stroke);
      socket.broadcast.emit('stroke', stroke);
    }
  });

  socket.on('changeBrush', function(brush){
    if (userInfo.id == theDrawer.id){
      history.push(brush);
      brushColor = brush.color;
      brushSize = brush.size;
      io.emit('changeBrush', {color:brushColor, size:brushSize});
    }
  });
});

// ---FUNCTIONS---
function encodeHTML(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function resetBrush(){
  brushColor = '#000000';
  brushSize = 10;
  io.emit('changeBrush', {color:brushColor, size:brushSize});
}

function resetCanvas(){
  io.emit('clearCanvas');
  history = [];
}

function resetTimer(){
  timeLeft = 91;
  io.emit('timeLeft', {time: timeLeft});
}

function randomizeWord(){
  currentWord = words[Math.floor(Math.random() * words.length)];
}

function randomizeDrawer(){
  var theNewDrawer = usersOnline[Math.floor(Math.random() * usersOnline.length)]
  while (theDrawer.id == theNewDrawer.id) {
    theNewDrawer = usersOnline[Math.floor(Math.random() * usersOnline.length)];
  }
  theDrawer = theNewDrawer;
}

function updateRooms(){
  var jsonData = JSON.stringify(rooms);
  fs.writeFile("public/rooms.json", jsonData, function(err) {
    if (err) {
        console.log(err);
    }
  });
}
