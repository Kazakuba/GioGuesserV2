function initGame(room = null, host = false) {
    isGameActive = true;
    document.getElementById('game-over-overlay')?.classList.add('hidden');

    isMultiplayer = !!room;
    isHost = !!host;
    roomCode = room;
    playerId = 'player_' + Math.random().toString(36).substr(2, 6);

    resetHealth();

    if (isMultiplayer) {
        setupMultiplayer();
    } else {
        document.getElementById('round-display').classList.add('hidden');
        newRound();
    }
}

function checkGuess() {
    if (!isGameActive) return;
    if (!marker) return alert('Click the map to place your guess first!');
    if (!currentLocation) return;

    const guessBtn = document.getElementById('guess-button');
    guessBtn.disabled = true;

    const guessedLocation = marker.getPosition();
    const distance = google.maps.geometry.spherical.computeDistanceBetween(currentLocation, guessedLocation);
    const distKm = Math.round(distance / 1000);

    const resultBox = document.getElementById('result');
    const resultContent = document.getElementById('result-content');
    resultBox.classList.remove('hidden');

    reverseGeocode(currentLocation, (actualCountry) => {
        reverseGeocode(guessedLocation, (guessedCountry) => {

            let isCorrect = false;
            if (actualCountry === guessedCountry && actualCountry !== 'Unknown') {
                isCorrect = true;
            } else if (distKm < 500) {
                isCorrect = true;
            }

            if (isCorrect) {
                resultContent.innerHTML = `<span style="color:#4CAF50; font-size:24px;">Excellent!</span><br>Dist: ${distKm} km<br>Loc: ${actualCountry}`;
                health = Math.min(100, health + 10);
                playSound('success');
            } else {
                resultContent.innerHTML = `<span style="color:#f44336; font-size:24px;">Missed!</span><br>Dist: ${distKm} km<br>Actual: ${actualCountry}`;
                let damage = 10;
                if (distKm > 5000) damage = 20;
                if (distKm > 10000) damage = 30;
                health = Math.max(0, health - damage);
                playSound('fail');
            }

            updateHealthUI(isCorrect);

            if (isMultiplayer) {
                playersRef.child(playerId).update({
                    health: health,
                    hasGuessed: true
                });
            }

            // Show Correct Location
            correctMarker = new google.maps.Marker({
                position: currentLocation,
                map,
                icon: { url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png" }
            });

            line = new google.maps.Polyline({
                path: [guessedLocation, currentLocation],
                geodesic: true,
                strokeColor: isCorrect ? '#4CAF50' : '#f44336',
                strokeOpacity: 1.0,
                strokeWeight: 3,
                map
            });

            fitMapToMarkers(guessedLocation, currentLocation);

            if (health <= 0) {
                resultContent.innerHTML += '<br><b>You have been eliminated!</b>';
                if (!isMultiplayer) {
                    setTimeout(() => {
                        alert("Game Over!");
                        location.reload();
                    }, 2000);
                }
            } else {
                if (!isMultiplayer) {
                    setTimeout(newRound, 4000);
                }
            }
        });
    });
}

function newRound() {
    if (health <= 0) resetHealth();

    document.getElementById('loading').style.display = 'flex';
    document.getElementById('guess-button').disabled = false;
    document.getElementById('result').classList.add('hidden');
    
    if (marker) marker.setMap(null);
    marker = null;
    if (correctMarker) correctMarker.setMap(null);
    if (line) line.setMap(null);

    attemptsToFindLocation = 0;
    findValidStreetView(getRandomLatLng());
}

function findValidStreetView(location) {
    const sv = new google.maps.StreetViewService();
    sv.getPanorama({
        location: location,
        radius: 100000,
        preference: 'nearest'
    }, (data, status) => {
        if (status === 'OK' && data.location) {
            setValidLocation(data.location.latLng);
        } else {
            console.log("Bad location, trying again...");
            if (++attemptsToFindLocation < 50) {
                findValidStreetView(getRandomLatLng());
            } else {
                alert('Could not find a valid location. Please refresh.');
                document.getElementById('loading').style.display = 'none';
            }
        }
    });
}

function setValidLocation(location) {
    currentLocation = location;
    if (panorama) {
        panorama.setPosition(currentLocation);
        panorama.setPov({ heading: 0, pitch: 0 });
        panorama.setVisible(true);
    }
    document.getElementById('loading').style.display = 'none';
    const btn = document.getElementById('guess-button');
    if (btn) btn.disabled = false;
}

function fitMapToMarkers(p1, p2) {
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(p1);
    bounds.extend(p2);
    map.fitBounds(bounds);
}

function reverseGeocode(latlng, callback) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === 'OK' && results[0]) {
            const country = results.find(r => r.types.includes('country'));
            callback(country ? country.formatted_address : 'Unknown Land');
        } else callback('Unknown Ocean');
    });
}

function getRandomLatLng() {
    const lat = (Math.random() * 140) - 70;
    const lng = (Math.random() * 360) - 180;
    return new google.maps.LatLng(lat, lng);
}

function resetHealth() {
    health = 100;
    updateHealthUI(true);
}