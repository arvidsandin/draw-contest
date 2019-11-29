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
var text = document.getElementById("input_text");
var userlist = document.getElementById('userlist');
var username;
var id;
var canDraw = false;
var currentWord = null;
var chat = document.getElementById('chat');
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

//Send message when enter is pressed
text.addEventListener('keydown', (e) => {
  if(e.keyCode==0x0D)
  send();
});

// ---SOCKET LISTENERS---
//Send initial info when connection
socket.on('init', function(conf){
  username = socket.id.substring(0, 5);
  id = socket.id;
  for (var i = 0; i < conf.usersOnline.length; i++) {
    userlist.innerHTML += (conf.usersOnline[i].username + '<br>');
  }
  userlist.innerHTML += (username + '<br>');
  socket.emit('connectInfo', {username:username, id:socket.id});
});

//Add user to list when someone has connected
socket.on('newUser', function(newUser){
  userlist.innerHTML += (newUser + '<br>');
});

//Update userlist when someone has disconnected
socket.on('someoneDisconnected', function(info){
  chat.value += (info.user) + " has disconnected\n";
  userlist.innerHTML = "";
  for (var user in info.usersOnline) {
      userlist.innerHTML += (info.usersOnline[user].username + '<br>');
  }
});

//// TODO: scroll to bottom
//Display new message in chat
socket.on('message', function(message){
  if (message.username == null){
    chat.value += (message.text + "\n");
  }
  else {
    chat.value += (message.username + ": " + message.text + "\n");
  }
  chat.scrollTop = chat.scrollHeight;
});

//Says if a person is allowed to draw
socket.on('allowedToDraw', function(allowedToDraw){
  canDraw = allowedToDraw.bool;
  textPlace = document.getElementById('wordToDraw');
  var clearButton = document.getElementById('button_clear');
  if (canDraw) {
    currentWord = allowedToDraw.word;
    textPlace.textContent = "Your word is: " + currentWord;
    chat.value += "You are drawing: " + currentWord + "\n";
    clearButton.style.display = "block";
    //Make cursor 'pointer'
    // var element = document.getElementById("drawingsquare");
    // element.classList.remove("col1");
    // element.classList.add("col2");
    // var element = document.getElementById("chatarea");
    // element.classList.remove("col2");
    // element.classList.add("col1");

  }
  else if (allowedToDraw.user.id != id){
    chat.value += allowedToDraw.user.username + " is drawing\n";
    currentWord = null;
    textPlace.textContent = " ";
    clearButton.style.display = "none";
    //Make cursor 'not-allowed'
    // var element = document.getElementById("drawingsquare");
    // element.classList.remove("col2");
    // element.classList.add("col1");
    // var element = document.getElementById("chatarea");
    // element.classList.remove("col1");
    // element.classList.add("col2");
  }
  chat.scrollTop = chat.scrollHeight;
});

//Display new strokes when someone else draws
socket.on('stroke', function(stroke){
  ctx.beginPath();
  ctx.moveTo(stroke.lastX, stroke.lastY);
  ctx.lineTo(stroke.e.offsetX, stroke.e.offsetY);
  ctx.stroke();
  [lastX, lastY] = [stroke.e.offsetX, stroke.e.offsetY];
});

//Clear canvas after correct guess
socket.on('clearCanvas', function(clear){
  ctx.clearRect(0, 0, (canvas.width), (canvas.height))
});

// ---FUNCTIONS---
//Send message
function send() {
  if (text.value != "") {
    socket.emit('message', {text:text.value, username:username});
    text.value = '';
  }
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
    var newX = make_relative(e.offsetX);
    var newY = make_relative(e.offsetY);
    ctx.lineTo(newX, newY);
    socket.emit('stroke', {lastX:lastX, lastY:lastY, e:{offsetX:newX, offsetY:newY}});
    ctx.stroke();
    [lastX, lastY] = [newX, newY];
  }

//adapt strokes for current canvas size
function make_relative(a){
  return(a*canvasResolution/canvas.clientHeight)
}
