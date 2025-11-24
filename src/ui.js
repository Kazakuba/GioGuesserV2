function bindModeButtons() {
    const overlay = document.getElementById('mode-overlay');
    const singleBtn = document.getElementById('singleplayer-btn');
    const multiBtn = document.getElementById('multiplayer-btn');
    const multiplayerOptions = document.getElementById('multiplayer-options');
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const backBtn = document.getElementById('back-btn');
    const roomInput = document.getElementById('room-code-input');
    const usernameInput = document.getElementById('username-input');

    singleBtn?.addEventListener('click', () => {
        isMultiplayer = false;
        if (ensureMapReady()) {
            overlay.style.display = 'none';
            initGame();
        }
    });

    multiBtn?.addEventListener('click', () => {
        multiplayerOptions.classList.remove('hidden');
        document.getElementById('mode-buttons').classList.add('hidden');
    });

    backBtn?.addEventListener('click', () => {
        multiplayerOptions.classList.add('hidden');
        document.getElementById('mode-buttons').classList.remove('hidden');
    });

    createRoomBtn?.addEventListener('click', () => {
        playerName = usernameInput.value.trim() || "Host";
        totalRounds = parseInt(document.getElementById('rounds-input').value) || 5;
        roundTime = parseInt(document.getElementById('round-time-input').value) || 60;

        roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        alert(`Room created! Share this code: ${roomCode}`);

        overlay.style.display = 'none';
        isMultiplayer = true;
        if (ensureMapReady()) initGame(roomCode, true);
    });

    joinRoomBtn?.addEventListener('click', () => {
        playerName = usernameInput.value.trim() || "Guest";
        const enteredCode = (roomInput.value || '').trim().toUpperCase();
        if (!enteredCode) return alert('Enter a valid room code');

        roomCode = enteredCode;
        overlay.style.display = 'none';
        isMultiplayer = true;
        if (ensureMapReady()) initGame(roomCode, false);
    });
}

function ensureMapReady() {
    if (!map || !panorama) {
        alert("Google Maps is still loading. Please wait a moment and try again.");
        return false;
    }
    return true;
}

function updateLobbyUI(players) {
    const list = document.getElementById('lobby-player-list');
    if (!list) return;
    list.innerHTML = '';

    Object.values(players).forEach(p => {
        const item = document.createElement('div');
        item.className = 'lobby-player-item';
        item.innerHTML = `<i class="fas fa-user"></i> <span>${p.name || p.id}</span>`;
        list.appendChild(item);
    });
}

function updateHealthUI(isHeal) {
    const healthBar = document.getElementById('health-bar');
    healthBar.style.width = `${health}%`;
    document.getElementById('health-label').textContent = `${health}%`;
    healthBar.classList.remove('health-damage', 'health-heal');
    void healthBar.offsetWidth; // Trigger reflow
    healthBar.classList.add(isHeal ? 'health-heal' : 'health-damage');
}

function updatePlayerIcons(players) {
    const container = document.getElementById('player-icons-container');
    if (!container) return;
    container.innerHTML = '';

    Object.values(players || {}).forEach(p => {
        const icon = document.createElement('div');
        icon.classList.add('player-icon');

        icon.innerHTML = `
            <i class="fas fa-user-astronaut" style="font-size: 20px;"></i>
            <div class="player-info">
                <div class="player-name">${p.name || p.id}</div>
                <div class="player-health-track">
                    <div class="player-health-fill" style="width:${p.health}%"></div>
                </div>
            </div>
            <span class="guessed-check ${p.hasGuessed ? 'visible' : ''}"><i class="fas fa-check-circle"></i></span>`;
        container.appendChild(icon);
    });
}

function updateCompass() {
    if (!panorama) return;
    const heading = panorama.getPov().heading;
    const arrow = document.getElementById('compass-arrow');
    if (arrow) arrow.style.transform = `translate(-50%, -100%) rotate(${-heading}deg)`;
}

function placeMarker(location) {
    if (!isGameActive) return;
    if (isMultiplayer && document.getElementById('guess-button').disabled) return;
    if (marker) marker.setPosition(location);
    else marker = new google.maps.Marker({ position: location, map });
}

function updateRoundDisplay(round) {
    document.getElementById('current-round').textContent = round;
    document.getElementById('total-rounds').textContent = totalRounds;
}

function startRoundTimer(startTime) {
    clearInterval(roundTimerInterval);
    const timerElement = document.getElementById('round-timer');

    roundTimerInterval = setInterval(() => {
        if (!startTime) return;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const timeLeft = Math.max(0, roundTime - elapsed);
        timerElement.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(roundTimerInterval);
            const btn = document.getElementById('guess-button');

            if (isMultiplayer && !btn.disabled) {
                health = Math.max(0, health - 25);
                updateHealthUI(false);
                
                playersRef.child(playerId).update({
                    health: health,
                    hasGuessed: true
                });

                document.getElementById('result-content').innerHTML = `<span style="color:#f44336">Time's Up!</span><br>You took 25 damage.`;
                document.getElementById('result').classList.remove('hidden');
                btn.disabled = true;
            }

            if (isHost && !isAdvancingRound) {
                isAdvancingRound = true;
                // Defined in src/firebase.js
                startNewRoundMultiplayer();
            }
        }
    }, 1000);
}
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        oscillator.start(now);
        oscillator.stop(now + 0.5);
    } else if (type === 'fail') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
    }
}