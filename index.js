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
  console.log('someone connected');
  console.log(usersOnline);
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
    socket.broadcast.emit('message', {text: info.username + ' has connected', username:null});
    usersOnline.push(info.username);
  });


  socket.on('message', function(message){
    socket.broadcast.emit('message', message);
    if (message.text == currentWord) {
      currentWord = words[Math.floor(Math.random() * words.length)];
      socket.emit('allowedToDraw', {bool:true, word: currentWord});
      socket.broadcast.emit('allowedToDraw', {bool:false, word:null});
    }
    socket.emit('message', {text:message.text, username:'You'});
    // socket.emit('allowedToDraw', {bool:true});//remove later
  });

  socket.on('stroke', function(stroke){
    socket.broadcast.emit('stroke', stroke);
  });
});



http.listen(3000, function(){
  console.log('listening on *:3000');
});
