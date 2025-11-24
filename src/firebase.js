function setupMultiplayer() {
    document.getElementById('round-display').classList.remove('hidden');
    roomRef = db.ref('rooms/' + roomCode);
    playersRef = roomRef.child('players');

    playersRef.child(playerId).set({
        id: playerId,
        name: playerName,
        health: 100,
        hasGuessed: false
    });

    playersRef.child(playerId).onDisconnect().remove();
    
    playersRef.on('value', snapshot => {
        const players = snapshot.val() || {};
        updatePlayerIcons(players);
        updateLobbyUI(players);
    });

    roomRef.on('value', snapshot => {
        const roomData = snapshot.val();
        if (!roomData) return;

        totalRounds = roomData.totalRounds || 5;
        roundTime = roomData.roundTime || 60;
        updateRoundDisplay(roomData.currentRound || 0);

        // 1. LOBBY STATE
        if (roomData.gameState === 'waiting') {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('game-over-overlay').classList.add('hidden');
            document.getElementById('lobby-overlay').classList.remove('hidden');
            document.getElementById('lobby-room-code').textContent = roomCode;
            
            if (isHost) {
                document.getElementById('lobby-start-btn').classList.remove('hidden');
                document.getElementById('lobby-wait-msg').classList.add('hidden');
                document.getElementById('lobby-start-btn').onclick = hostStartGame;
            } else {
                document.getElementById('lobby-start-btn').classList.add('hidden');
                document.getElementById('lobby-wait-msg').classList.remove('hidden');
            }
            currentRound = 0; 
        }

        // 2. GAME OVER STATE
        if (roomData.gameState === 'finished') {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('game-over-overlay').classList.remove('hidden');
            document.getElementById('lobby-overlay').classList.add('hidden');
            
            currentRound = 0;

            const players = Object.values(roomData.players || {}).sort((a, b) => b.health - a.health);
            let scoreHtml = `<table><tr><th>Rank</th><th>Player</th><th>Health</th></tr>`;
            players.forEach((p, index) => {
                scoreHtml += `<tr>
                    <td><span class="score-rank">#${index + 1}</span></td>
                    <td class="score-name">${p.name || p.id}</td>
                    <td class="score-hp">${p.health}%</td>
                </tr>`;
            });
            scoreHtml += `</table>`;
            document.getElementById('final-scoreboard').innerHTML = scoreHtml;

            if (isHost) {
                document.getElementById('host-restart-options').classList.remove('hidden');
                document.getElementById('waiting-for-host-message').classList.add('hidden');
            } else {
                document.getElementById('host-restart-options').classList.add('hidden');
                document.getElementById('waiting-for-host-message').classList.remove('hidden');
            }
        } else {
            if (roomData.gameState !== 'finished') {
                document.getElementById('game-over-overlay').classList.add('hidden');
            }
        }

        // 3. GAME IN PROGRESS
        if (roomData.gameState === 'in_progress') {
            document.getElementById('lobby-overlay').classList.add('hidden');

            if (roomData.currentRound > currentRound) {
                document.getElementById('loading').style.display = 'flex';
                resetHealth(); 
                currentRound = roomData.currentRound;

                if (marker) marker.setMap(null);
                marker = null;
                if (correctMarker) correctMarker.setMap(null);
                if (line) line.setMap(null);
                document.getElementById('result').classList.add('hidden');
                document.getElementById('guess-button').disabled = false;

                const newLocation = new google.maps.LatLng(roomData.currentLocation.lat, roomData.currentLocation.lng);
                setValidLocation(newLocation);
                startRoundTimer(roomData.roundStartTime);
            }
        }

        if (isHost && roomData.gameState === 'in_progress' && !isAdvancingRound) {
            const players = Object.values(roomData.players || {});
            const allGuessed = players.length > 0 && players.every(p => p.hasGuessed);

            if (allGuessed) {
                isAdvancingRound = true;
                clearInterval(roundTimerInterval);
                setTimeout(startNewRoundMultiplayer, 4000);
            }
        }
    });

    if (isHost) {
        roomRef.update({
            gameState: 'waiting',
            currentRound: 0,
            totalRounds: totalRounds,
            roundTime: roundTime
        });
    }
}

function hostStartGame() {
    if (!isHost) return;
    roomRef.child('gameState').set('in_progress');
    startNewRoundMultiplayer();
}

function hostRestartGame() {
    if (!isHost) return;
    
    document.getElementById('game-over-overlay')?.classList.add('hidden');
    const newRounds = parseInt(document.getElementById('new-rounds-input').value) || 5;
    const newTime = parseInt(document.getElementById('new-round-time-input').value) || 60;
    
    totalRounds = newRounds;
    roundTime = newTime;

    playersRef.once('value').then(snapshot => {
        const players = snapshot.val() || {};
        const updates = {};
        updates['/gameState'] = 'in_progress';
        updates['/currentRound'] = 0;
        updates['/totalRounds'] = totalRounds;
        updates['/roundTime'] = roundTime;
        Object.keys(players).forEach(pId => {
            updates[`/players/${pId}/health`] = 100;
            updates[`/players/${pId}/hasGuessed`] = false;
        });
        roomRef.update(updates).then(() => {
            resetHealth(); 
            startNewRoundMultiplayer();
        });
    });
}

async function startNewRoundMultiplayer() {
    if (!isHost) return;
    const roomSnapshot = await roomRef.once('value');
    const roomData = roomSnapshot.val();
    let round = roomData.currentRound || 0;

    if (round >= roomData.totalRounds) {
        await roomRef.child('gameState').set('finished');
        return;
    }

    findValidMultiplayerLocation(round, roomData.players || {});
}

function findValidMultiplayerLocation(currentRoundValue, players) {
    attemptsToFindLocation = 0;
    const find = () => {
        const sv = new google.maps.StreetViewService();
        sv.getPanorama({
            location: getRandomLatLng(),
            radius: 100000,
            preference: 'nearest'
        }, (data, status) => {
            if (status === 'OK' && data.location) {
                const pos = data.location.latLng;
                const updates = {};

                Object.keys(players).forEach(pId => {
                    updates[`/players/${pId}/hasGuessed`] = false;
                });
                updates['/currentRound'] = currentRoundValue + 1;
                updates['/currentLocation'] = { lat: pos.lat(), lng: pos.lng() };
                updates['/roundStartTime'] = firebase.database.ServerValue.TIMESTAMP;

                roomRef.update(updates).then(() => {
                    isAdvancingRound = false;
                });
            } else {
                if (++attemptsToFindLocation < 50) find();
                else find();
            }
        });
    };
    find();
}