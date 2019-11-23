var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var words = require('./words.json');
var currentWord;
var usersOnline=[];

app.use(express.static(__dirname + '/'));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});


io.on('connection', function(socket){
  var username;
  if (usersOnline.length == 0){
    currentWord = words[Math.floor(Math.random() * words.length)];
    socket.emit('allowedToDraw', {bool:true, word: currentWord});
  }
  else {
    socket.emit('allowedToDraw', {bool:false, word:null});
  }
  socket.emit('init', {usersOnline:usersOnline});
  socket.on('connectInfo', function(info){
    socket.broadcast.emit('newUser', info.username);
    username = info.username;
    console.log(info.username + ' connected');
    socket.broadcast.emit('message', {
      text: info.username + ' has connected', username:null
    });
    usersOnline.push(info.username);
  });


  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
      socket.connect();
    }
    else {
      console.log(username + " disconnected");
      usersOnline = usersOnline.filter(e => e !== username);
      socket.broadcast.emit('someoneDisconnected', {
        usersOnline:usersOnline, user:username;
      });
    }
  });

  socket.on('message', function(message){
    socket.broadcast.emit('message', message);
    socket.emit('message', {text:message.text, username:'You'});
    if (message.text.toLowerCase() == currentWord) {
      io.emit('message', {text:'Correct!', user:null});
      socket.broadcast.emit('allowedToDraw', {bool:false, word:null});
      setTimeout(function(){
        currentWord = words[Math.floor(Math.random() * words.length)];
        socket.emit('allowedToDraw', {bool:true, word: currentWord});
        io.emit('clearCanvas');
      }, 1500);
    }
  });

  socket.on('stroke', function(stroke){
    socket.broadcast.emit('stroke', stroke);
  });
});



http.listen(3000, function(){
  console.log('listening on *:3000');
});
