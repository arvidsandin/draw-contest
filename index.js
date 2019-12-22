var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var words = require('./words.json');
var currentWord = "";
var usersOnline=[];
var theDrawer = {username:null, id:null};
var brushColor = "#000000";
var brushSize = 10;
var timeLeft = 61;
var history = [];


app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

setInterval(function(){
  timeLeft -= 1;
  if (timeLeft < 0 && usersOnline.length > 1) {
    timeLeft = 61;
    io.emit('message', {
      text: 'Time ran out! Randomizing new drawer...', username:null
    });
    var theNewDrawer = usersOnline[Math.floor(Math.random() * usersOnline.length)]
    while (theDrawer == theNewDrawer) {
      theNewDrawer = usersOnline[Math.floor(Math.random() * usersOnline.length)];
    }
    theDrawer = theNewDrawer;
    io.emit('allowedToDraw', {
      bool:false, word:null, user:theDrawer
    });
    resetBrush();
    currentWord = words[Math.floor(Math.random() * words.length)];
    setTimeout(function(){
      io.to(theDrawer.id).emit('allowedToDraw', {
        bool:true, word:currentWord, user:theDrawer
      });
      io.emit('clearCanvas');
      history = [];
      timeLeft = 61;
      io.emit('timeLeft', {time: timeLeft});
    }, 1500);
  }
}, 1000);

setInterval(function(){
  io.emit('timeLeft', {time:timeLeft});
}, 10000);

io.on('connection', function(socket){
  var username;
  var id;
  var userInfo;
  socket.emit('init', {brushSize:brushSize, brushColor:brushColor, history: history});
  socket.emit('scoreBoard', usersOnline);
  socket.emit('timeLeft', {time:timeLeft});
  socket.on('connectInfo', function(info){
    username = info.username;
    id = info.id;
    userInfo = {
      username:username,
      htmlusername:encodeHTML(username),
      id:id,
      drawerPoints:0,
      guesserPoints:0
    };
    console.log(info.username + ' connected');
    socket.broadcast.emit('message', {
      text: info.username + ' has connected', username:null
    });
    if (usersOnline.length <= 0){
      currentWord = words[Math.floor(Math.random() * words.length)];
      theDrawer = {username:username, id:id};
      socket.emit('allowedToDraw', {bool:true, word: currentWord, user:theDrawer});
      timeLeft = 61;
      io.emit('timeLeft', {time: timeLeft});
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
    if (id == theDrawer.id){
      history = [];
      io.emit('clearCanvas');
      history.push({color: brushColor, size: brushSize});
    }
  });

  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
      socket.connect();
    }
    else {
      console.log(username + " disconnected");
      usersOnline = usersOnline.filter(e => e.id != id);
      io.emit('scoreBoard', usersOnline);
      socket.broadcast.emit('message', {
        text: username + ' has disconnected', username:null
      });
      if (id == theDrawer.id){
        history = [];
        resetBrush();
        // If there are people left, randomize a new drawer
        if (usersOnline.length > 0){
          theDrawer = usersOnline[Math.floor(Math.random() * usersOnline.length)];
          socket.broadcast.emit('allowedToDraw', {
            bool:false, word:null, user:theDrawer
          });
          resetBrush();
          currentWord = words[Math.floor(Math.random() * words.length)];
          io.to(theDrawer.id).emit('allowedToDraw', {
            bool:true, word:currentWord, user:theDrawer
          });
          io.emit('clearCanvas');
          timeLeft = 61;
          io.emit('timeLeft', {time: timeLeft});
        }
      }
    }
  });

  socket.on('message', function(message){
    if (id != theDrawer.id){
      text = encodeHTML(message.text);
      socket.broadcast.emit('message', {text:text, username:encodeHTML(message.username)});
      socket.emit('message', {text:text, username:'You'});
      if (message.text.toLowerCase() == currentWord) {
        io.emit('message', {text:'Correct!', user:null});
        // Give points
        usersOnline.find(user => user.id == theDrawer.id).drawerPoints += 1;
        usersOnline.find(user => user.id == id).guesserPoints += 1;
        // change drawer
        theDrawer = {username:username, id:id};
        io.emit('scoreBoard', usersOnline);
        socket.broadcast.emit('allowedToDraw', {bool:false, word:null, user:theDrawer});
        currentWord = words[Math.floor(Math.random() * words.length)];
        setTimeout(function(){
          socket.emit('allowedToDraw', {bool:true, word: currentWord, user:theDrawer});
          resetBrush();
          io.emit('clearCanvas');
          history = [];
          timeLeft = 61;
          io.emit('timeLeft', {time: timeLeft});
        }, 1500);
      }
    }
  });

  socket.on('stroke', function(stroke){
    if (id == theDrawer.id){
      history.push(stroke);
      socket.broadcast.emit('stroke', stroke);
    }
  });

  socket.on('changeBrush', function(brush){
    if (id == theDrawer.id){
      history.push(brush);
      brushColor = brush.color;
      brushSize = brush.size;
      io.emit('changeBrush', {color:brushColor, size:brushSize});
    }
  });
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 80;
}
http.listen(port, function(){
  console.log('listening on *:80');
});

function encodeHTML(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function resetBrush(){
  brushColor = '#000000';
  brushSize = 10;
  io.emit('changeBrush', {color:brushColor, size:brushSize});
}
