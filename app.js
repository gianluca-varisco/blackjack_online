// Configurazione e Stato di Rete
let peer = null;
let conn = null; 
let connections = []; 
let isHost = false;
let myPeerId = "";
let myNickname = "";
let inviteRoomId = "";

// Stato del Gioco (Blackjack)
let roomStatus = 'LOBBY'; // LOBBY, BETTING, PLAYER_TURN, DEALER_TURN, ROUND_OVER
let players = []; // { id, name, bet, score, status: 'PLAYING'|'STAND'|'BUST'|'BJ'|'IDLE', cards: [] }
let activePlayerIndex = 0;
let deck = [];
let dealerCards = [];
let dealerScore = 0;
let isProcessingAction = false;

window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get('room');
    
    const savedHostRoom = sessionStorage.getItem('bj_host_room');
    const savedHostNick = sessionStorage.getItem('bj_host_nick');

    if (savedHostRoom && savedHostNick && !room) {
        document.getElementById('join-group').style.display = 'none';
        document.getElementById('lobby-divider').style.display = 'none';
        document.getElementById('btn-host').disabled = true;
        
        myNickname = savedHostNick;
        inviteRoomId = savedHostRoom;
        isHost = true;
        reconnectHost(savedHostRoom);
    } else if (room) {
        document.getElementById('join-id').value = room.toUpperCase();
        document.getElementById('btn-host').style.display = 'none';
        document.getElementById('lobby-divider').style.display = 'none';
        document.getElementById('host-id-display').innerText = "Entrando nella stanza: " + room.toUpperCase();
    }
};

function generateShortId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

// Inizializzazione Rete con i tuoi server STUN/TURN dedicati per sbloccare i Carrier mobili
function initPeer(customId, callback) {
    if (peer) { try { peer.destroy(); } catch(e) {} }

    peer = new Peer(customId, {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        pingInterval: 3000,
        config: {
            'iceServers': [
                { 'urls': 'stun:stun.relay.metered.ca:80' },
                { 'urls': 'turn:global.relay.metered.ca:80', 'username': '35098f37f93a6fd59b3bf2d3', 'credential': 'C5NDV3NAO9MK+HZD' },
                { 'urls': 'turn:global.relay.metered.ca:80?transport=tcp', 'username': '35098f37f93a6fd59b3bf2d3', 'credential': 'C5NDV3NAO9MK+HZD' },
                { 'urls': 'turn:global.relay.metered.ca:443', 'username': '35098f37f93a6fd59b3bf2d3', 'credential': 'C5NDV3NAO9MK+HZD' },
                { 'urls': 'turns:global.relay.metered.ca:443?transport=tcp', 'username': '35098f37f93a6fd59b3bf2d3', 'credential': 'C5NDV3NAO9MK+HZD' }
            ]
        }
    });
    
    peer.on('open', (id) => { myPeerId = id; callback(id); });
    peer.on('disconnected', () => peer.reconnect());
    peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            setTimeout(() => { reconnectHost(customId); }, 3000);
        }
    });
}

function startHost() {
    myNickname = prompt("Inserisci il tuo Nome:") || "Dealer/Host";
    const shortId = generateShortId();
    inviteRoomId = shortId;
    isHost = true;
    
    sessionStorage.setItem('bj_host_room', shortId);
    sessionStorage.setItem('bj_host_nick', myNickname);
    
    reconnectHost(shortId);
}

function reconnectHost(shortId) {
    initPeer(shortId, (id) => {
        document.getElementById('host-id-display').innerText = "ID Tavolo: " + id;
        document.getElementById('btn-host').disabled = true;
        document.getElementById('btn-join').disabled = true;
        document.getElementById('btn-copy-link').style.display = 'inline-block';
        
        if (players.length === 0) {
            players = [{ id: id, name: myNickname, bet: 0, score: 0, status: 'IDLE', cards: [] }];
        } else {
            players[0].id = id;
        }
        
        updatePlayerListUI();
        document.getElementById('player-list-container').style.display = 'block';
        document.getElementById('btn-start-game').style.display = 'inline-block';
        
        peer.on('connection', (connection) => {
            connections = connections.filter(c => c.peer !== connection.peer);
            connections.push(connection);
            setupHostConnection(connection);
        });
    });
}

function copyInviteLink() {
    if (!inviteRoomId) return;
    const inviteUrl = window.location.origin + window.location.pathname + "?room=" + inviteRoomId;
    if (navigator.share) {
        navigator.share({ title: 'Tavolo Blackjack', text: 'Siediti al mio tavolo di Blackjack:', url: inviteUrl });
    } else {
        navigator.clipboard.writeText(inviteUrl).then(() => {
            alert("Link copiato negli appunti!");
        });
    }
}

function joinGame() {
    const hostId = document.getElementById('join-id').value.trim().toUpperCase();
    if (!hostId) return alert("Inserisci un ID valido!");
    
    myNickname = prompt("Inserisci il tuo Nome:") || "Giocatore";
    isHost = false;
    
    initPeer(undefined, (id) => {
        conn = peer.connect(hostId);
        conn.on('open', () => {
            conn.send({ type: 'SEND_NICKNAME', nickname: myNickname });
            document.getElementById('lobby').style.display = 'none';
            document.getElementById('table').style.display = 'block';
            document.getElementById('my-name-display').innerText = myNickname;
        });
        
        conn.on('data', (data) => {
            if (data.type === 'UPDATE_PLAYERS') {
                players = data.players;
                updatePlayerListUI();
            }
            if (data.type === 'UPDATE_STATE') {
                players = data.players;
                roomStatus = data.roomStatus;
                activePlayerIndex = data.activePlayerIndex;
                dealerCards = data.dealerCards;
                dealerScore = data.dealerScore;
                isProcessingAction = data.isProcessingAction;
                syncUI();
            }
        });
    });
}

function broadcast(data) {
    if (!isHost) return;
    connections.forEach(c => { if (c.open) c.send(data); });
}

function setupHostConnection(connection) {
    connection.on('data', (data) => {
        if (data.type === 'SEND_NICKNAME') {
            if (!players.some(p => p.id === connection.peer)) {
                players.push({ id: connection.peer, name: data.nickname, bet: 0, score: 0, status: 'IDLE', cards: [] });
            }
            updatePlayerListUI();
            broadcast({ type: 'UPDATE_PLAYERS', players: players });
        }
        if (data.type === 'PLACE_BET') {
            handlePlaceBet(connection.peer, data.bet);
        }
        if (data.type === 'HIT') {
            if (players[activePlayerIndex].id === connection.peer) handleHitAction();
        }
        if (data.type === 'STAND') {
            if (players[activePlayerIndex].id === connection.peer) handleStandAction();
        }
    });
}

// --- LOGICA DI GIOCO (BLACKJACK COERENTE CON L'ENGINE HOST) ---

function createBlackjackDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    let newDeck = [];
    // Utilizziamo 4 mazzi regolamentari da casinò
    for (let m = 0; m < 4; m++) {
        for (let s of suits) {
            for (let r of ranks) {
                newDeck.push({ rank: r, suit: s, isClosed: false });
            }
        }
    }
    // Mischia
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
}

function calculateScore(cards) {
    let score = 0;
    let aces = 0;
    for (let card of cards) {
        if (card.isClosed) continue;
        if (['J', 'Q', 'K'].includes(card.rank)) score += 10;
        else if (card.rank === 'A') { score += 11; aces++; }
        else score += parseInt(card.rank);
    }
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
}

function startGame() {
    if (!isHost) return;
    sessionStorage.removeItem('bj_host_room');
    
    deck = createBlackjackDeck();
    roomStatus = 'BETTING';
    players.forEach(p => {
        p.bet = 0;
        p.cards = [];
        p.score = 0;
        p.status = 'PLAYING';
    });
    dealerCards = [];
    dealerScore = 0;
    
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('table').style.display = 'block';
    document.getElementById('my-name-display').innerText = myNickname;
    
    sendGameState();
}

function placeBet(amount) {
    if (isHost) {
        handlePlaceBet(myPeerId, amount);
    } else {
        conn.send({ type: 'PLACE_BET', bet: amount });
    }
}

function handlePlaceBet(playerId, amount) {
    let p = players.find(x => x.id === playerId);
    if (p) p.bet = amount;
    
    // Se tutti hanno puntato, l'host distribuisce le prime carte
    if (players.every(x => x.bet > 0)) {
        roomStatus = 'PLAYER_TURN';
        activePlayerIndex = 0;
        
        // Distribuzione iniziale (2 carte a testa, 2 al banco di cui una coperta)
        players.forEach(x => {
            x.cards.push(deck.pop(), deck.pop());
            x.score = calculateScore(x.cards);
            if (x.score === 21) x.status = 'BLACKJACK';
        });
        
        dealerCards.push(deck.pop()); // Scoperta
        let closedCard = deck.pop();
        closedCard.isClosed = true;   // Coperta
        dealerCards.push(closedCard);
        dealerScore = calculateScore(dealerCards);
        
        // Passa oltre se il primo giocatore ha già fatto Blackjack naturale
        checkNextTurnRequired();
    }
    sendGameState();
}

function playerHit() {
    if (isHost) handleHitAction();
    else conn.send({ type: 'HIT' });
}

function handleHitAction() {
    if (isProcessingAction) return;
    let p = players[activePlayerIndex];
    p.cards.push(deck.pop());
    p.score = calculateScore(p.cards);
    
    if (p.score > 21) {
        p.status = 'BUST';
        isProcessingAction = true;
        sendGameState();
        setTimeout(() => {
            isProcessingAction = false;
            advanceTurn();
        }, 1500);
    } else {
        sendGameState();
    }
}

function playerStand() {
    if (isHost) handleStandAction();
    else conn.send({ type: 'STAND' });
}

function handleStandAction() {
    let p = players[activePlayerIndex];
    p.status = 'STAND';
    advanceTurn();
}

function checkNextTurnRequired() {
    while (activePlayerIndex < players.length && (players[activePlayerIndex].status === 'BUST' || players[activePlayerIndex].status === 'BLACKJACK')) {
        activePlayerIndex++;
    }
    if (activePlayerIndex >= players.length) {
        handleDealerTurn();
    }
}

function advanceTurn() {
    activePlayerIndex++;
    if (activePlayerIndex >= players.length) {
        handleDealerTurn();
    } else {
        checkNextTurnRequired();
        sendGameState();
    }
}

// INTEGRAZIONE BANCO AUTOMATICO (Regola del 17)
function handleDealerTurn() {
    roomStatus = 'DEALER_TURN';
    // Rivela la carta coperta
    dealerCards.forEach(c => c.isClosed = false);
    dealerScore = calculateScore(dealerCards);
    sendGameState();

    function dealerLoop() {
        if (dealerScore < 17) {
            dealerCards.push(deck.pop());
            dealerScore = calculateScore(dealerCards);
            sendGameState();
            setTimeout(dealerLoop, 1200);
        } else {
            resolveRound();
        }
    }
    setTimeout(dealerLoop, 1200);
}

function resolveRound() {
    roomStatus = 'ROUND_OVER';
    let summary = "Risultati del Tavolo:\n\n";
    
    players.forEach(p => {
        if (p.status === 'BUST') {
            summary += `${p.name}: Sballato (-${p.bet}€)\n`;
        } else if (p.status === 'BLACKJACK' && dealerScore !== 21) {
            summary += `${p.name}: Blackjack Naturale! (+${p.bet * 1.5}€)\n`;
        } else if (dealerScore > 21) {
            summary += `${p.name}: Vince! Il banco ha sballato (+${p.bet}€)\n`;
        } else if (p.score > dealerScore) {
            summary += `${p.name}: Vince contro il banco (+${p.bet}€)\n`;
        } else if (p.score < dealerScore) {
            summary += `${p.name}: Perde contro il banco (-${p.bet}€)\n`;
        } else {
            summary += `${p.name}: Pareggio (Push) (0€)\n`;
        }
    });
    
    sendGameState();
    setTimeout(() => {
        alert(summary);
        if (isHost) {
            // Rilancia automaticamente la fase di scommessa dopo la chiusura
            setTimeout(() => startGame(), 1000);
        }
    }, 500);
}

function sendGameState() {
    if (!isHost) return;
    const state = {
        players: players,
        roomStatus: roomStatus,
        activePlayerIndex: activePlayerIndex,
        dealerCards: dealerCards,
        dealerScore: dealerScore,
        isProcessingAction: isProcessingAction
    };
    syncUI();
    broadcast({ type: 'UPDATE_STATE', ...state });
}

// --- RENDERIZZAZIONE E UI SINCRONIZZATA ---

function updatePlayerListUI() {
    const list = document.getElementById('player-list');
    if (!list) return;
    list.innerHTML = "";
    players.forEach(p => {
        const li = document.createElement('li');
        li.innerText = p.name + (p.id === myPeerId ? " (Tu)" : "");
        list.appendChild(li);
    });
}

function getCardHTML(card) {
    if (card.isClosed) {
        return `<div class="card card-back">♣️</div>`;
    }
    const isRed = ['♥', '♦'].includes(card.suit);
    return `
        <div class="card ${isRed ? 'red' : 'black'}">
            <div class="card-corner">${card.rank}</div>
            <div class="card-value">${card.suit}</div>
            <div class="card-corner bottom">${card.rank}</div>
        </div>
    `;
}

function syncUI() {
    // Sincronizzazione Schermate
    if (roomStatus === 'LOBBY') return;
    
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('table').style.display = 'block';
    
    // Gestione visualizzazione betting box
    const me = players.find(p => p.id === myPeerId);
    if (roomStatus === 'BETTING' && me && me.bet === 0) {
        document.getElementById('betting-area').style.display = 'block';
    } else {
        document.getElementById('betting-area').style.display = 'none';
    }

    // Render Carte Banco
    const dealerCardsDiv = document.getElementById('dealer-cards');
    dealerCardsDiv.innerHTML = "";
    dealerCards.forEach(c => dealerCardsDiv.innerHTML += getCardHTML(c));
    document.getElementById('dealer-score-display').innerText = 
        (roomStatus === 'PLAYER_TURN') ? "Punti: ?" : `Punti: ${dealerScore}`;

    // Render Carte Personali
    if (me) {
        const myCardsDiv = document.getElementById('my-cards');
        myCardsDiv.innerHTML = "";
        me.cards.forEach(c => myCardsDiv.innerHTML += getCardHTML(c));
        document.getElementById('my-score-display').innerText = `Punti: ${me.score} | Puntata Virtuale: ${me.bet}€`;
    }

    // Abilitazione controlli di turno
    const isMyTurn = (roomStatus === 'PLAYER_TURN' && players[activePlayerIndex]?.id === myPeerId);
    document.getElementById('btn-hit').disabled = !isMyTurn || isProcessingAction;
    document.getElementById('btn-stand').disabled = !isMyTurn || isProcessingAction;

    // Gestione Turn Indicator barra di stato
    const indicator = document.getElementById('turn-indicator');
    if (roomStatus === 'BETTING') {
        indicator.innerText = "Fase di puntata virtuale...";
        indicator.style.backgroundColor = "#2e5c43";
    } else if (roomStatus === 'DEALER_TURN') {
        indicator.innerText = "Il Banco sta giocando...";
        indicator.style.backgroundColor = "#d2691e";
    } else if (isMyTurn) {
        indicator.innerText = "Tocca a te! Carta o Stai?";
        indicator.style.backgroundColor = "#ffd700";
        indicator.style.color = "#000";
    } else {
        const activeName = players[activePlayerIndex] ? players[activePlayerIndex].name : "...";
        indicator.innerText = `Turno di ${activeName}...`;
        indicator.style.backgroundColor = "#2e5c43";
        indicator.style.color = "#fff";
    }

    // Render Avversari
    const opponentsContainer = document.getElementById('opponents-row');
    opponentsContainer.innerHTML = "";
    players.forEach(p => {
        if (p.id !== myPeerId) {
            const box = document.createElement('div');
            box.className = `opponent-box ${p.status === 'BUST' ? 'opp-busted' : p.status === 'STAND' ? 'opp-banked' : ''}`;
            
            let cardsHTML = "";
            p.cards.forEach(c => { cardsHTML += getCardHTML(c); });
            
            box.innerHTML = `
                <h4>${p.name} (Punti: ${p.score})</h4>
                <p style="font-size:12px; color:#ffd700; margin:4px 0;">Puntata: ${p.bet}€ | Stato: ${p.status}</p>
                <div class="opponent-cards-row mini-cards">${cardsHTML}</div>
            `;
            opponentsContainer.appendChild(box);
        }
    });
}