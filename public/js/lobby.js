function Get(link){
  var Httpreq = new XMLHttpRequest(); // a new request
  Httpreq.open('GET',link,false);
  Httpreq.send(null);
  return Httpreq.responseText;
}

var roomList = document.getElementById('room_list');
var newRoomNameInput = document.getElementById("create_room_input");
refreshRooms();
askUsername();

newRoomNameInput.addEventListener("keyup", function(event) {
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    event.preventDefault();
    document.getElementById("button_create").click();
  }
});
roomList.addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    document.getElementById("join_button").click();
  }
});


function refreshRooms(){
  roomList.style="color:#888";
  var rooms = JSON.parse(Get('./rooms.json'));
  while (roomList.firstChild) {roomList.removeChild(roomList.firstChild);}
  if (rooms.length==0){
    var p = document.createElement('p');
    p.innerHTML = 'There are no available rooms right now. Feel free to create a new one!';
    p.style = 'font-size:12pt'
    roomList.appendChild(p);
    document.getElementById('join_button').style = 'display:none'
  }
  else{
    document.getElementById('join_button').style = 'display:inline-block'
    for (var i = 0; i < rooms.length; i++) {
      var label = document.createElement('label');
      label.className = 'room_label';
      label.name = 'rooms';
      var input = document.createElement('input');
      input.type = 'radio';
      input.className = 'room_radio';
      input.value = rooms[i].name;
      input.name = 'room';
      var span = document.createElement('span');
      if (rooms[i].players != 1){
        span.innerHTML = rooms[i].htmlName + ': ' + rooms[i].players + ' players';
      }
      else{
        span.innerHTML = rooms[i].htmlName + ': ' + rooms[i].players + ' player';
      }
      label.appendChild(input);
      label.appendChild(span);
      roomList.appendChild(label);
    }
  }
  roomList.style="color=#000";
}

function joinRoom(){
  var availableRooms = document.getElementsByClassName('room_radio');
  for (var i = 0; i < availableRooms.length; i++) {
    if (availableRooms[i].checked) {
      var selectedRoom = availableRooms[i].value;
    }
  }
  if (selectedRoom != undefined) {
    sessionStorage.setItem('room', selectedRoom);
    window.location.href = 'play';
  }
  else {
    window.alert('You need to choose a room');
  }
}
function askUsername(){
  var username = sessionStorage.getItem('username');
  if (username == undefined || username == '' || username == null){
    username = window.prompt('What is your username?');
    if (username == undefined || username == '' || username == null){
    }
    else {
      sessionStorage.setItem('username', username);
    }
  }
}

function createRoom(){
  var name = document.getElementById('create_room_input').value;
  var availableRooms = document.getElementsByClassName('room_radio');
  var maxPoints = document.getElementById('points').value;
  var nameIsAvailable = true;
  for (var i = 0; i < availableRooms.length; i++) {
    if (availableRooms[i].value == name) {
      nameIsAvailable = false;
    }
  }
  if (nameIsAvailable && name != '' && name != undefined) {
    sessionStorage.setItem('room', name);
      sessionStorage.setItem('maxPoints', maxPoints);
    window.location.href = 'play';
  }
  else{
    window.alert('This room name is already taken');
  }
}
