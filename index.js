var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var words = require('./words.json');
var currentWord = "";
var usersOnline=[];
var theDrawer = {username:null, id:null};
var brushColor = "#000";
var brushSize = 10;

app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
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
      theDrawer = {username:username, id:id};
      socket.emit('allowedToDraw', {bool:true, word: currentWord, user:theDrawer});
    }
    else {
      socket.emit('allowedToDraw', {
        bool:false, word:null, user:theDrawer
      });
    }
    usersOnline.push({username:username, id:id});
  });

  socket.on('clearCanvas', (x) => {
    if (id == theDrawer.id){
      io.emit('clearCanvas');
    }
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
      var brushColor = "#000";
      var brushSize = 10;
      if (id == theDrawer.id && usersOnline.length > 0){
        theDrawer = usersOnline[Math.floor(Math.random() * usersOnline.length)];
        socket.broadcast.emit('allowedToDraw', {
          bool:false, word:null, user:theDrawer
        });
        currentWord = words[Math.floor(Math.random() * words.length)];
        io.to(theDrawer.id).emit('allowedToDraw', {
          bool:true, word:currentWord, user:theDrawer
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
      theDrawer = {username:username, id:id};
      socket.broadcast.emit('allowedToDraw', {bool:false, word:null, user:theDrawer});
      setTimeout(function(){
        currentWord = words[Math.floor(Math.random() * words.length)];
        socket.emit('allowedToDraw', {bool:true, word: currentWord, user:theDrawer});
        io.emit('clearCanvas');
      }, 1500);
    }
  });

  socket.on('stroke', function(stroke){
    if (id == theDrawer.id){
      socket.broadcast.emit('stroke', stroke);
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
