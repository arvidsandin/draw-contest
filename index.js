var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var words = require('./words.json');
var fs = require('fs');
var currentWord = '';
var usersOnline = [];
var theDrawer = {username:null, id:null, htmlusername:null};
var brushColor = '#000000';
var brushSize = 10;
var history = [];
var jsonRooms = [];
var rooms = [];
/*
A room looks like this:
var room = {
  name: 'room1',
  htmlName: 'room1',
  players: [player1, player2],
  theDrawer: playerX,
  brushColor:'000',
  brushSize: 10,
  currentWord: 'word',
  history: [],
  timeLeft: 91,
};

*/
updateRooms();

//Magical numbers
var timeLeft = 91; //in seconds
var minMessageInterval = 200; //in milliseconds
var newDrawerDelay = 1500; //in milliseconds

app.use(express.static(__dirname + '/public'));

var port = process.env.PORT;
if (port == null || port == '') {
  port = 80;
}
http.listen(port, function(){
  console.log('listening on port ' + port);
});

// lower timer every second and check if time is out
setInterval(function(){
  for (let i = 0; i < rooms.length; i++) {
    rooms[i].timeLeft -= 1;
    if (rooms[i].timeLeft < 0 && rooms[i].players.length > 1) {
      io.to(rooms[i].name).emit('message', {
        text: 'Time ran out! The word was "' + rooms[i].currentWord + '". Randomizing new drawer...', username:null
      });
      randomizeDrawer(rooms[i]);
      io.to(rooms[i].name).emit('allowedToDraw', {
        bool:false, word:null, user:rooms[i].theDrawer
      });
      resetBrush(rooms[i]);
      randomizeWord(rooms[i]);
      resetTimer(rooms[i]);
      setTimeout(function(){
        io.to(rooms[i].theDrawer.id).emit('allowedToDraw', {
          bool:true, word:rooms[i].currentWord, user:rooms[i].theDrawer
        });
        resetCanvas(rooms[i]);
        resetTimer(rooms[i]);
      }, newDrawerDelay);
    }
  }
}, 1000);

//sync time every 10 s
setInterval(function(){
  for (var i = 0; i < rooms.length; i++) {
    io.to(rooms[i].name).emit('timeLeft', {time:rooms[i].timeLeft});
  }
}, 10000);

io.on('connection', function(socket){
  var userInfo;
  var currentRoom;
  var messageTimestamp = Date.now();
  socket.emit('init');
  socket.emit('scoreBoard', usersOnline);
  socket.emit('timeLeft', {time:timeLeft});
  socket.on('connectInfo', function(info){
    if(info.room == null || info.room == '' || info.username == null || info.username == ''){
      socket.disconnect();
    }
    else{
      userInfo = {
        username:info.username,
        htmlusername:encodeHTML(info.username),
        id:socket.id,
        drawerPoints:0,
        guesserPoints:0,
        roomName:info.room
      };
      socket.join(userInfo.roomName);
      currentRoom = getRoom(userInfo.roomName);
      if (currentRoom != undefined) {
        currentRoom.players.push(userInfo);
        socket.emit('history', {brushSize:currentRoom.brushSize, brushColor:currentRoom.brushColor, history:currentRoom.history});
        socket.emit('allowedToDraw', {bool:false, word:null, user:currentRoom.theDrawer});
      }
      else {
        currentRoom = {
          name: userInfo.roomName,
          htmlName: encodeHTML(userInfo.roomName),
          players: [userInfo],
          theDrawer: userInfo,
          brushColor:'',
          brushSize: 0,
          currentWord: '',
          history: [],
          timeLeft: 91,
        }
        rooms.push(currentRoom);
        randomizeWord(currentRoom);
        socket.emit('allowedToDraw', {bool:true, word: currentRoom.currentWord, user:userInfo});
        resetTimer(currentRoom);
        resetBrush(currentRoom);
        resetCanvas(currentRoom);
      }
      updateRooms();
      console.log(info.username + ' connected');
      socket.to(userInfo.room).broadcast.emit('message', {
        text: userInfo.htmlusername + ' has connected', username:null
      });
      io.emit('scoreBoard', currentRoom.players);
    }
  });

  socket.on('clearCanvas', (x) => {
    if (userInfo.id == currentRoom.theDrawer.id){
      resetCanvas(currentRoom);
      currentRoom.history.push({color: brushColor, size: brushSize});
    }
  });

  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
      socket.connect();
    }
    else if(userInfo != undefined &&
            userInfo.roomName != null &&
            userInfo.roomName != '' &&
            userInfo.name != undefined &&
            userInfo.name!= ''){
      console.log(userInfo.username + ' disconnected');
      currentRoom.players = currentRoom.players.filter(user => user.id != userInfo.id);
      io.to(currentRoom).emit('scoreBoard', usersOnline);
      socket.to(currentRoom.name).broadcast.emit('message', {
        text: userInfo.htmlusername + ' has disconnected', username:null
      });
      if (userInfo.id == currentRoom.theDrawer.id){
        resetCanvas(currentRoom);
        resetBrush(currentRoom);
        resetTimer(currentRoom);
        // If there are people left, randomize a new drawer
        if (currentRoom.players.length > 0){
          randomizeDrawer(currentRoom);
          socket.to(currentRoom.name).broadcast.emit('allowedToDraw', {
            bool:false, word:null, user:theDrawer
          });
          randomizeWord(currentRoom);
          io.to(currentRoom.theDrawer.id).emit('allowedToDraw', {
            bool:true, word:currentWord, user:theDrawer
          });
          resetTimer(currentRoom);
        }
        // Remove room if it is empty
        else {
          rooms = rooms.filter(room => room.name != currentRoom.name);
        }
      }
      updateRooms();
    }
  });

  socket.on('message', function(message){
    if (userInfo.id != theDrawer.id && Date.now() - messageTimestamp > minMessageInterval){
      text = encodeHTML(message.text);
      socket.to(currentRoom.name).broadcast.emit('message', {text:text, username:userInfo.username});
      socket.emit('message', {text:text, username:'You'});
      if (message.text.toLowerCase() == currentRoom.currentWord) {
        io.to(currentRoom.name).emit('message', {text:'Correct!', user:null});
        // Give points
        currentRoom.players.find(user => user.id == theDrawer.id).drawerPoints += 1;
        currentRoom.players.find(user => user.id == userInfo.id).guesserPoints += 1;
        // change drawer
        currentRoom.theDrawer = userInfo;
        io.to(currentRoom.name).emit('scoreBoard', currentRoom.players);
        io.to(currentRoom.name).broadcast.emit('allowedToDraw', {bool:false, word:null, user:theDrawer});
        randomizeWord(currentRoom);
        setTimeout(function(){
          socket.emit('allowedToDraw', {bool:true, word: currentWord, user:theDrawer});
          resetBrush(currentRoom);
          resetCanvas(currentRoom);
          resetTimer(currentRoom);
        }, newDrawerDelay);
      }
    }
    messageTimestamp = Date.now();
  });

  socket.on('stroke', function(stroke){
    if (userInfo.id == currentRoom.theDrawer.id){
      currentRoom.history.push(stroke);
      socket.to(currentRoom.name).broadcast.emit('stroke', stroke);
    }
  });

  socket.on('changeBrush', function(brush){
    if (userInfo.id == currentRoom.theDrawer.id){
      currentRoom.history.push(brush);
      currentRoom.brushColor = brush.color;
      currentRoom.brushSize = brush.size;
      io.to(currentRoom.name).emit('changeBrush', {color:currentRoom.brushColor, size:currentRoom.brushSize});
    }
  });
});

// ---FUNCTIONS---
function encodeHTML(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function resetBrush(room){
  room.brushColor = '#000000';
  room.brushSize = 10;
  io.to(room.name).emit('changeBrush', {color:room.brushColor, size:room.brushSize});
}

function resetCanvas(room){
  io.to(room.name).emit('clearCanvas');
  room.history = [];
}

function resetTimer(room){
  room.timeLeft = 91;
  io.to(room).emit('timeLeft', {time: room.timeLeft});
}

function randomizeWord(room){
  room.currentWord = words[Math.floor(Math.random() * words.length)];
}

function randomizeDrawer(room){
  var theNewDrawer = room.players[Math.floor(Math.random() * room.players.length)]
  while (room.theDrawer.id == theNewDrawer.id) {
    theNewDrawer = room.players[Math.floor(Math.random() * room.players.length)]
  }
  room.theDrawer = theNewDrawer;
}

function getRoom(roomName){
  return rooms.find(roomToFind => roomToFind.name == roomName);
}

function updateRooms(){
  jsonRooms = [];
  for (var i = 0; i < rooms.length; i++) {
    jsonRooms.push({name:rooms[i].name, players:rooms[i].players.length});
  }
  var jsonData = JSON.stringify(jsonRooms);
  fs.writeFile('public/rooms.json', jsonData, function(err) {
    if (err) {
        console.log(err);
    }
  });
}
