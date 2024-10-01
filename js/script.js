let map = L.map('map').setView([34.00095151499077, -118.25133692966446], 11);
let marker;

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

let params = new URLSearchParams(window.location.search);
let vehicleID = params.get('vehicleID');
let firstMatch = true;

if (vehicleID) {
    document.querySelector('h1').innerText = `Vehicle ID: ${vehicleID}`;
    console.log('vehicleID: ', vehicleID);

    let counterDiv = document.querySelector('#loadingTime');
    let counter = 0;
    counterDiv.innerText = counter;

    setInterval(function () {
        counter++;
        counterDiv.innerText = counter;
    }, 1000);

}

const socket = new WebSocket('wss://api.metro.net/ws/LACMTA/vehicle_positions');
socket.addEventListener('open', (e) => {
    console.log('Connected to websocket server');
});
socket.addEventListener('message', (e) => {
    let data = JSON.parse(e.data);

    if (data.id === vehicleID) {
        if (firstMatch) {
            firstMatch = false,
                document.querySelector('#content').innerText = '';
            marker = L.marker([data.vehicle.position.latitude, data.vehicle.position.longitude]).addTo(map);
        } else {
            marker.setLatLng([data.vehicle.position.latitude, data.vehicle.position.longitude]);
        }

        let unixTimestamp = data.vehicle.timestamp;
        let date = new Date(unixTimestamp * 1000);
        let localTime = date.toLocaleString();

        console.log('Message received from server: ', data);
        document.querySelector('#content').innerText =
            `Vehicle ID: ${data.id}\n` +
            `Route ID: ${data.route_code}\n` +
            `Current Status: ${data.vehicle.currentStatus}\n` +
            `Timestamp: ${localTime}\n` +
            `Coordinates: ${data.vehicle.position.latitude}, ${data.vehicle.position.longitude}\n\n`;

    }
});
socket.addEventListener('error', (e) => {
    console.error('WebSocket error: ', error);
});