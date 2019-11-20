var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/'));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});


io.on('connection', function(socket){
  socket.emit('init', {})
  socket.on('message', function(message){
    socket.broadcast.emit('message', message);
    socket.emit('message', {text:message.text, username:'You'});
  });
  socket.on('stroke', function(stroke){
    socket.broadcast.emit('stroke', stroke);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
