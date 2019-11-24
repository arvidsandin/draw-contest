var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var words = require('./words.json');
var currentWord = "";
var usersOnline=[];
var theDrawer = {username:null, id:null};

app.use(express.static(__dirname + '/'));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});


io.on('connection', function(socket){
  var username;
  var id;
  socket.emit('init', {usersOnline:usersOnline});
  socket.on('connectInfo', function(info){
    socket.broadcast.emit('newUser', info.username);
    username = info.username;
    id = info.id;
    console.log(info.username + ' connected');
    socket.broadcast.emit('message', {
      text: info.username + ' has connected', username:null
    });
    if (usersOnline.length <= 0){
      currentWord = words[Math.floor(Math.random() * words.length)];
      socket.emit('allowedToDraw', {bool:true, word: currentWord});
      theDrawer = {username:username, id:id};
    }
    else {
      socket.emit('allowedToDraw', {
        bool:false, word:null, user:theDrawer
      });
    }
    usersOnline.push({username:username, id:id});
  });


  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
      socket.connect();
    }
    else {
      console.log(username + " disconnected");
      usersOnline = usersOnline.filter(e => e.id != id);
      socket.broadcast.emit('someoneDisconnected', {
        usersOnline:usersOnline, user:username
      });
      if (id == theDrawer.id && usersOnline.length > 0){
        theDrawer = usersOnline[Math.floor(Math.random() * usersOnline.length)];
        socket.broadcast.emit('allowedToDraw', {
          bool:false, word:null, user:theDrawer
        });
        currentWord = words[Math.floor(Math.random() * words.length)];
        io.to(theDrawer.id).emit('allowedToDraw', {
          bool:true, word:currentWord
        });
        io.emit('clearCanvas');
      }
    }
  });

  socket.on('message', function(message){
    socket.broadcast.emit('message', message);
    socket.emit('message', {text:message.text, username:'You'});
    if (message.text.toLowerCase() == currentWord) {
      io.emit('message', {text:'Correct!', user:null});
      socket.broadcast.emit('allowedToDraw', {bool:false, word:null, user:theDrawer});
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
