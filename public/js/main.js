var map;
var sock = io();
var planeMap = new Map();

//-167.2764, 5.4995, -52.2330, 83.1621
const NORTHAMERICA_BOUNDS = [[-52.2330, 83.1621],[,5.4995,-167.2764]]; 
const SOUTHAMERICA_BOUNDS = [[-109.4749, -59.4505],[ -26.3325, 13.3903]];

const AFRICA_BOUNDS = [[-25.3587, -46.9005],[ 63.5254, 37.5671]];
const ASIA_BOUNDS = [[-25.3587, -46.9005, 63.5254, 37.5671]];
const AUSTRALIA_BOUNDS = [[105.3770, -53.0587],[ -175.2925, -6.0694]];

//new BoundingBox(-31.2660, 27.6363, 39.8693, 81.0088));
const EUROPE_BOUNDS = [[34.8693, -31.2660],[ 81.0088, 27.6363]];

var planeIcon = L.icon({
  iconUrl: 'img/plane_icon.svg',
  iconSize: [20, 20], // size of the icon
  });

  

(function init() {
  initMap();

  var bounds = NORTHAMERICA_BOUNDS;

// create an orange rectangle
  //var boundingBox = L.rectangle(bounds, {color: "#ff7800", weight: 1});
  //map.addLayer(boundingBox);

  sock.on('flight_coords', function(c) {
    console.log(c);
    drawMarker(c.icao,c.from, c.to, c.lat, c.lng);
  });
})();

function drawMarker(icao,from, to,lat, lng) {
  var planeMarker = null;
  // L.marker([lat, lng]).addTo(map);
  if (planeMap.size==0 || !planeMap.has(icao)) {
    var tooltip = icao;
    planeMarker = L.marker([lat, lng], {icon:planeIcon, title:tooltip});
    planeMap.set(icao, planeMarker);
    planeMarker.addTo(map);
  } else {
    planeMarker = planeMap.get(icao);
    if (planeMarker!=null) {
      var newLatLng = new L.LatLng(lat, lng);
      console.log("Modified:"+icao);
      console.log(JSON.stringify(planeMarker.getLatLng())+"->"+JSON.stringify(newLatLng))
      planeMarker.setLatLng(newLatLng);
    }
  } 
  console.log(planeMap.size); 

}

function initMap() {
  console.log('Initializing map');
  map = L.map('map').setView([20, 0], 2.5);

  // Set up map source
  L.tileLayer(
    'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Open Street Map',
      maxZoom: 18
    }).addTo(map);
}