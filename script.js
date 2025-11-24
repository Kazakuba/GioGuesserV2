const GOOGLE_MAPS_API_KEY = 'Your_Google_Maps_API_Key_Here';

let panorama = null,
    map = null,
    marker = null,
    correctMarker = null,
    line = null;
let currentLocation = null,
    mapContainer = null;

let health = 100,
    attemptsToFindLocation = 0;
const maxAttempts = 13;
let isGameActive = false;

let isMultiplayer = false,
    roomCode = null,
    isHost = false,
    playerId = null,
    playerName = "Guest";
let totalRounds = 5,
    roundTime = 60,
    currentRound = 0;
let roundTimerInterval = null,
    roomRef = null,
    playersRef = null;
let isAdvancingRound = false;

const firebaseConfig = {
    apiKey: "Your_Firebase_API_Key_Here",
    authDomain: "Your_Firebase_Auth_Domain_Here",
    databaseURL: "Your_Firebase_Database_URL_Here",
    projectId: "Your_Firebase_Project_ID_Here",
    storageBucket: "Your_Firebase_Storage_Bucket_Here",
    messagingSenderId: "Your_Firebase_Messaging_Sender_ID_Here",
    appId: "Your_Firebase_App_ID_Here",
    measurementId: "Your_Firebase_Measurement_ID_Here"
};
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

window.addEventListener('load', () => {
    bindModeButtons();
    
    document.getElementById('restart-game-btn')?.addEventListener('click', hostRestartGame);
    document.getElementById('return-home-btn')?.addEventListener('click', () => location.reload());
    
    const mapCont = document.getElementById('map-container');
    mapCont?.addEventListener('mouseenter', () => {
        mapCont.classList.add('expanded');
        if (map) google.maps.event.trigger(map, 'resize');
    });
    mapCont?.addEventListener('mouseleave', () => {
        mapCont.classList.remove('expanded');
        if (map) google.maps.event.trigger(map, 'resize');
    });
});

window.initMap = function() {
    console.log("Google Maps loaded, initializing...");

    mapContainer = document.getElementById('map-container');

    panorama = new google.maps.StreetViewPanorama(document.getElementById('street-view'), {
        position: { lat: 0, lng: 0 },
        pov: { heading: 165, pitch: 0 },
        zoom: 1,
        addressControl: false,
        showRoadLabels: false,
        enableCloseButton: false,
        linksControl: true,
        clickToGo: true,
        visible: false,
        fullscreenControl: false
    });

    panorama.addListener('pov_changed', updateCompass);

    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 0, lng: 0 },
        zoom: 1,
        disableDefaultUI: true,
        clickableIcons: false,
        fullscreenControl: false
    });

    map.addListener('click', e => placeMarker(e.latLng));
    document.getElementById('guess-button')?.addEventListener('click', checkGuess);

    document.getElementById('loading').style.display = 'none';
    console.log("Map initialized, loader hidden.");
};