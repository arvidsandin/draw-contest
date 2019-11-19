
var canvas = document.getElementById('canvas');
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
var ctx = canvas.getContext('2d');
ctx.strokeStyle='#000';
ctx.lineWidth=5;
ctx.strokeRect(0, 0, (canvas.width), (canvas.height));

ctx.lineJoin = 'round';
ctx.lineCap = 'round';
ctx.lineWidth = 5;
ctx.strokeStyle = "#000000";

canvas.addEventListener('mousedown', () => isDrawing = true);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseout', () => isDrawing = false);
var isDrawing = false;
var lastX = 0;
var lastY = 0;

var text = document.getElementById("input_text");

// ----------------
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
  });

text.addEventListener('keydown', (e) => {
  if(e.keyCode==0x0D)
  send();
});

function send() {
  var chat = document.getElementById('chat');
  if (text.value != "") {
    chat.value += ("You: " + text.value + "\n");
    text.value = "";
  }
}

function clearChat() {
  document.getElementById('chat').value = "";
  ctx.clearRect(0, 0, (canvas.width), (canvas.height))
  ctx.lineWidth=5;
  ctx.strokeRect(0, 0, (canvas.width), (canvas.height));
}

function draw(e) {
    // stop the function if they are not mouse down
    if(!isDrawing) return;
    //listen for mouse move event
    console.log(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
  }
