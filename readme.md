# 🃏 Blackjack Online Multiplayer P2P

Un'applicazione web full-stack per giocare a Blackjack in tempo reale con i tuoi amici direttamente dal browser. L'architettura è interamente **Peer-to-Peer (P2P)**: non richiede database cloud o server di backend proprietari a pagamento, rendendo il progetto ideale per essere pubblicato gratuitamente su **GitHub Pages**.

---

## 🚀 Funzionalità Principali
* **Multiplayer Realtime:** Sincronizzazione immediata delle giocate e dello stato del tavolo tramite WebSockets (PeerJS).
* **Banco Automatico:** Intelligenza artificiale integrata lato Host che segue rigidamente le regole ufficiali del casinò (Stand su 17).
* **Mobile Ready:** Interfaccia responsive con panno verde da casinò ottimizzata per smartphone, tablet e PC.
* **Condivisione Smart:** Generazione automatica di link d'invito rapidi per WhatsApp.
* **Bypass Carrier Mobili:** Configurazione di server STUN/TURN dedicati per garantire la stabilità di connessione anche su reti mobili (es. WindTre, Vodafone, Kena).

---

## 🛠️ Tecnologie Utilizzate
* **HTML5 / CSS3:** Struttura della pagina e stile responsive del tavolo e delle carte da gioco.
* **JavaScript (ES6):** Gestione dello stato del gioco, dell'algoritmo del mazzo e dei punteggi.
* **PeerJS (WebRTC):** Rete P2P diretta tra il browser dell'Host e quello dei Client connessi.

