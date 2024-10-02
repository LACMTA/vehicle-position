let receivedVehicleIDs = new Set();
let firstMatch = true;
let firstVehicleID;
let isUpdating = false;

let map = L.map('map').setView([34.00095151499077, -118.25133692966446], 11);
let marker;
let line;

/*********************/
/*  Leaflet Section  */
/*********************/

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

/*********************/
/*   URL Parameters  */
/*********************/

let params = new URLSearchParams(window.location.search);
let vehicleID = params.get('vehicleID');

/*********************/
/*  Content Overlay  */
/*********************/

if (vehicleID) {
    document.querySelector('#content-overlay h1').innerText = `Vehicle ID: ${vehicleID}`;
    document.querySelector('#targetVehicleId').innerText = vehicleID;
    console.log('vehicleID: ', vehicleID);

    let counterDiv = document.querySelector('#loadingTime');
    let counter = 0;
    counterDiv.innerText = counter;

    let totalVehiclesDiv = document.querySelector('#totalVehicles');

    setInterval(function () {
        counter++;
        counterDiv.innerText = counter;
        totalVehiclesDiv.innerText = receivedVehicleIDs.size;
    }, 1000);
} else {
    document.querySelector('#content-overlay h1').innerText = `No Vehicle ID provided`;
    document.querySelector('#info').innerHTML = 'Please provide a vehicle ID in the URL parameters.  Example: <a href="?vehicleID=8624">?vehicleID=8624</a>';
}

/*********************/
/* WebSocket Section */
/*********************/

const socket = new WebSocket('wss://api.metro.net/ws/LACMTA/vehicle_positions');

socket.addEventListener('open', (e) => {
    console.log('Connected to websocket server');
});

socket.addEventListener('message', (e) => {
    if (isUpdating) {
        return;
    }

    isUpdating = true;

    let data = JSON.parse(e.data);
    receivedVehicleIDs.add(data.id);
    let vehicleLatLng = [data.vehicle.position.latitude, data.vehicle.position.longitude];

    if (firstVehicleID === undefined) {
        firstVehicleID = data.id;
    } else if (firstVehicleID === data.id) {
        console.log('First vehicle ID reached again. Total vehicles: ', receivedVehicleIDs.size);
    }

    if (data.id === vehicleID) {
        if (firstMatch) {
            firstMatch = false;
            
            document.querySelector('#info').innerText = '';
            marker = L.marker(vehicleLatLng).addTo(map);
            line = L.polyline([vehicleLatLng, vehicleLatLng], {
                color: '#0aa2c8',
                weight: 6
            }).addTo(map);

            map.setView(vehicleLatLng, 16);
        } else {
            console.log('Updating marker position to: ', vehicleLatLng);
            marker.setLatLng(vehicleLatLng);

            // Update line to add another point to the polyline
            let latlngs = line.getLatLngs();
            latlngs.push(vehicleLatLng);
            line.setLatLngs(latlngs);
        }

        let unixTimestamp = data.vehicle.timestamp;
        let date = new Date(unixTimestamp * 1000);
        let localTime = date.toLocaleString();

        console.log('Message received from server: ', data);

        let routeCode = data.route_code ? data.route_code : 'none assigned';
        let vehicleStatus = data.vehicle.currentStatus ? data.vehicle.currentStatus : 'none';

        if (vehicleStatus == 'STOPPED_AT') {
            vehicleStatus = 'stopped';
        } else if (vehicleStatus == 'IN_TRANSIT_TO') {
            vehicleStatus = 'in transit';
        }

        document.querySelector('#info').innerText =
            `Route: ${routeCode}\n` +
            `Current Status: ${vehicleStatus}\n\n` +
            `Position Last Updated: ${localTime}`;

    } else {
        if (data.vehicle.position == null || data.vehicle.position.latitude == null || data.vehicle.position.longitude == null) {
            console.log('No coordinates for vehicle ID: ', data.id);
        }
    }

    isUpdating = false;
});

socket.addEventListener('error', (e) => {
    console.error('WebSocket error: ', error);
});