function Get(link){
    var Httpreq = new XMLHttpRequest(); // a new request
    Httpreq.open('GET',link,false);
    Httpreq.send(null);
    return Httpreq.responseText;
}
var roomList = document.getElementById('room_list');
var oldRooms = document.getElementsByClassName('room_label');
while (oldRooms.length != 0) {roomList.removeChild(oldRooms[0]);}
askUsername();

var rooms = JSON.parse(Get('./rooms.json'));
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
  span.innerHTML = rooms[i].name + ': ' + rooms[i].players + ' players';
  label.appendChild(input);
  label.appendChild(span);
  roomList.appendChild(label);
}

function joinRoom(){
  var availableRooms = document.getElementsByClassName('room_radio');
  for (var i = 0; i < availableRooms.length; i++) {
    if (availableRooms[i].checked) {
      var selectedRoom = availableRooms[i].value;
    }
  }
  if (selectedRoom != undefined) {
    console.log(selectedRoom);
    sessionStorage.setItem('room', selectedRoom);
    window.location.href = 'play';
  }
  else {
    window.alert('You need to choose a room');
  }
}
function askUsername(){
  var username = sessionStorage.getItem("username");
  console.log(username);
  if (username == undefined || username == "" || username == null){
    username = window.prompt("What is your username?");
    if (username == undefined || username == "" || username == null){
    }
    else {
      sessionStorage.setItem("username", username);
    }
  }
}
