
var socket = io();

var canvas = document.getElementById('canvas');
canvasResolution = 1000;
canvas.width = canvasResolution;
canvas.height = canvasResolution;
var ctx = canvas.getContext('2d');

ctx.lineJoin = 'round';
ctx.lineCap = 'round';
ctx.lineWidth = 5;
ctx.strokeStyle = "#000";

canvas.addEventListener('mousedown', () => isDrawing = true);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseout', () => isDrawing = false);
var isDrawing = false;
var lastX = 0;
var lastY = 0;
var text = document.getElementById("input_text");
var username;

// ----------------
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    [lastX, lastY] = [make_relative(e.offsetX), make_relative(e.offsetY)];
  });

text.addEventListener('keydown', (e) => {
  if(e.keyCode==0x0D)
  send();
});

socket.on('init', function(conf){
  username = socket.id;
  console.log(username);
});

socket.on('message', function(message){
  chat.value += (message.username + ": " + message.text + "\n");
});

socket.on('stroke', function(stroke){
  ctx.beginPath();
  ctx.moveTo(stroke.lastX, stroke.lastY);
  ctx.lineTo(stroke.e.offsetX, stroke.e.offsetY);
  ctx.stroke();
  [lastX, lastY] = [stroke.e.offsetX, stroke.e.offsetY];
});
// ---------------
function send() {
  var chat = document.getElementById('chat');
  if (text.value != "") {
    socket.emit('message', {text:text.value, username:username});
    text.value = '';
  }
}

function clearChatAndCanvas() {
  document.getElementById('chat').value = "";
  ctx.clearRect(0, 0, (canvas.width), (canvas.height))
}

function draw(e) {
    // stop the function if they are not mouse down
    if(!isDrawing) return;
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

function make_relative(a){
  return(a*canvasResolution/canvas.clientWidth)
}
