// ---InitialINITIAL VARIABLES---
var socket = io();

//Canvas stuff
var canvas = document.getElementById('canvas');
canvasResolution = 1000;
canvas.width = canvasResolution*1.4;
canvas.height = canvasResolution;
var ctx = canvas.getContext('2d');
ctx.lineJoin = 'round';
ctx.lineCap = 'round';
ctx.lineWidth = 10;
ctx.strokeStyle = "#000";

//Other variables
var isDrawing = false;
var lastX = 0;
var lastY = 0;
var input = document.getElementById("input_text");
var userlist = document.getElementById('userlist');
var username;
var id;
var canDraw = false;
var currentWord = null;
var chat = document.getElementById('chat');
var timer = document.getElementById('timer');
var timeLeft = -10;

// ---EVENT LISTENERs---
//Listen to mouse events
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    [lastX, lastY] = [make_relative(e.offsetX), make_relative(e.offsetY)];
    draw(e);
  });
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseout', () => isDrawing = false);

canvas.addEventListener('touchstart', (e) => {
    isDrawing = true;
    var offset = canvas.getBoundingClientRect();
    lastX = make_relative(e.touches[0].clientX-offset.left);
    lastY = make_relative(e.touches[0].clientY-offset.top);
    draw(e);
  });
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', () => isDrawing = false);
canvas.addEventListener('touchcancel', () => isDrawing = false);
canvas.addEventListener('mouseout', () => isDrawing = false);

//Send message when enter is pressed
input.addEventListener('keydown', (e) => {
  if(e.keyCode==0x0D)
  send();
});

setInterval(function(){
  timeLeft -= 1;
  if (timeLeft < -1) {
    timer.style.display = 'none';
  }
  timer.innerHTML = 'Time left: 0'+(Math.floor(timeLeft / 60)) + ':' + (('0'+(Math.floor(timeLeft % 60))).slice(-2));
}, 1000);

// ---SOCKET LISTENERS---
//Send initial info when connection
socket.on('init', function(conf){
  username = socket.id.substring(0, 5);
  id = socket.id;
  for (var i = 0; i < conf.usersOnline.length; i++) {
    userlist.innerHTML += (conf.usersOnline[i].username + '<br>');
  }
  userlist.innerHTML += (username + '<br>');
  console.log(conf.history);
  for (var i = 0; i < conf.history.length; i++){
    event = conf.history[i]
    // if (event.lastX != undefined){
      ctx.beginPath();
      ctx.moveTo(event.lastX, event.lastY);
      ctx.lineTo(event.offsetX, event.offsetY);
      ctx.stroke();
    // }
    // else{
      ctx.strokeStyle =  event.color;
      ctx.lineWidth =  event.size;
    // }
  }



  ctx.lineWidth = conf.brushSize;
  ctx.strokeStyle = conf.brushColor;
  socket.emit('connectInfo', {username:username, id:socket.id});
});

//Add user to list when someone has connected
socket.on('newUser', function(newUser){
  userlist.innerHTML += (newUser.htmlusername + '<br>');
});

//Update userlist when someone has disconnected
socket.on('someoneDisconnected', function(info){
  chat.innerHTML += (info.user) + " has disconnected<br>";
  userlist.innerHTML = "";
  for (var user in info.usersOnline) {
      userlist.innerHTML += (info.usersOnline[user].htmlusername + '<br>');
  };
});

socket.on('disconnect', (reason) => {
    chat.innerHTML += "You have disconnected<br>";
    userlist.innerHTML = "";
});

//Display new message in chat
socket.on('message', function(message){
  if (message.username == null){
    chat.innerHTML += (message.text + "<br>");
  }
  else {
    chat.innerHTML += message.username + ": " + message.text + "<br>";
  }
  textbox = document.getElementById('textbox');
  textbox.scrollTop = textbox.scrollHeight;
});

//If you are the drawer show brush tools and your word, otherwise hide them
socket.on('allowedToDraw', function(allowedToDraw){
  canDraw = allowedToDraw.bool;
  textPlace = document.getElementById('wordToDraw');
  var clearButton = document.getElementById('button_clear');
  var modifyers = document.getElementsByClassName('brush_modifyer');
  if (canDraw) {
    input.disabled = true;
    currentWord = allowedToDraw.word;
    textPlace.textContent = "Your word is: " + currentWord;
    chat.innerHTML += "You are drawing: " + currentWord + "<br>";
    clearButton.style.display = "inline";
    for (i = 0; i < modifyers.length; i++) {
      modifyers[i].style.display = "inline";
    };
    //Make cursor 'pointer'
  }
  else if (allowedToDraw.user.id != id){
    input.disabled = false;
    chat.innerHTML += allowedToDraw.user.username + " is drawing<br>";
    currentWord = null;
    textPlace.textContent = " ";
    clearButton.style.display = "none";
    for (i = 0; i < modifyers.length; i++) {
      modifyers[i].style.display = "none";
    };
    //Make cursor 'not-allowed'
  }
  chat.scrollTop = chat.scrollHeight;
});

//Display new strokes when someone else draws
socket.on('stroke', function(stroke){
  ctx.beginPath();
  ctx.moveTo(stroke.lastX, stroke.lastY);
  ctx.lineTo(stroke.offsetX, stroke.offsetY);
  ctx.stroke();
  [lastX, lastY] = [stroke.offsetX, stroke.offsetY];
});

//Clear canvas after correct guess
socket.on('clearCanvas', function(clear){
  ctx.clearRect(0, 0, (canvas.width), (canvas.height))
});

socket.on('changeBrush', function(brush) {
  ctx.strokeStyle =  brush.color;
  ctx.lineWidth =  brush.size;
});

socket.on('timeLeft', function(time) {
  timeLeft = time.time;
  if (timeLeft > -1) {
    timer.style.display = 'block';
  }
})
// ---FUNCTIONS---
//Send message
function send() {
  if (input.value != "") {
    socket.emit('message', {text:input.value, username:username});
    input.value = '';
  }
}

function changeColor(newColor) {
  socket.emit('changeBrush', {color:newColor, size:ctx.lineWidth});
}
function changeBrushSize(newSize) {
  socket.emit('changeBrush', {color:ctx.strokeStyle, size:newSize});
}

function clearCanvas() {
  socket.emit('clearCanvas', {});
}

function clearChatAndCanvas() {
  document.getElementById('chat').value = "";
  ctx.clearRect(0, 0, (canvas.width), (canvas.height))
}

function draw(e) {
    // stop the function if they are not mouse down or if not allowed to draw
    if(!isDrawing || !canDraw) return;
    //listen for mouse move event
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    if(e.touches!=undefined){
      var offset = canvas.getBoundingClientRect();
      newX = make_relative(e.touches[0].clientX-offset.left);
      newY = make_relative(e.touches[0].clientY-offset.top);
    }
    else {
      var newX = make_relative(e.offsetX);
      var newY = make_relative(e.offsetY);
    }
    ctx.lineTo(newX, newY);
    socket.emit('stroke', {lastX:lastX, lastY:lastY, offsetX:newX, offsetY:newY});
    ctx.stroke();
    [lastX, lastY] = [newX, newY];
  }

//adapt strokes for current canvas size
function make_relative(a){
  return(a*canvasResolution/canvas.clientHeight)
}
