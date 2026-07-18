# 🃏 Regolamento Ufficiale - Blackjack Multiplayer P2P

Benvenuto al tavolo verde! Questo documento contiene le regole ufficiali e i flussi di gioco implementati all'interno dell'applicazione. Il gioco si basa sul Blackjack classico da casinò, adattato per una gestione interamente automatica del Banco e sessioni multiplayer in tempo reale tra amici.

---

## 1. Obiettivo del Gioco
L'obiettivo di ogni giocatore è **battere il Banco**. Per farlo, devi ottenere un punteggio totale delle carte superiore a quello del Banco senza mai superare i **21 punti**. 
* Se superi i 21 punti, hai **sballato (Bust)** e perdi immediatamente la tua puntata.

---

## 2. Valore delle Carte
Il gioco utilizza 4 mazzi regolamentari da 52 carte ciascuno. Il valore di ogni carta è calcolato come segue:
* **Carte numeriche (da 2 a 10):** Mantengono il loro valore nominale (es. un 7 vale 7 punti).
* **Figure (Fante [J], Donna [Q], Re [K]):** Valgono sempre **10 punti**.
* **Asso [A]:** Ha un valore dinamico. Vale **11 punti** se il totale della mano non supera 21; scala automaticamente a **1 punto** se il valore 11 farebbe sballare il giocatore.

---

## 3. Il Flusso di una Partita

1. **Fase di Puntata (Betting):** All'inizio del round, ogni giocatore sceglie una puntata virtuale tra le tre opzioni disponibili: **10 €**, **100 €** o **1000 €** (soldi 100% fittizi).
2. **Distribuzione Iniziale:** Quando tutti i partecipanti hanno puntato, l'Host distribuisce le carte:
   * **Giocatori:** Due carte scoperte a testa.
   * **Banco:** Una carta scoperta e una carta coperta (a faccia in giù).
3. **Turno dei Giocatori:** A partire dal primo giocatore della lobby, ognuno gioca il proprio turno in modo sequenziale. Il turno finisce quando il giocatore decide di stare o sballa.
4. **Turno del Banco:** Una volta che tutti i giocatori hanno concluso il proprio turno, il Banco gira la sua carta coperta e gioca seguendo regole algoritmiche rigide.
5. **Risoluzione e Risultati:** Il sistema confronta i punteggi finali, assegna le vincite virtuali e riavvia automaticamente una nuova mano.

---

## 4. Azioni Consentite al Giocatore
Durante il tuo turno attivo puoi eseguire due mosse principali:
* **Carta (Hit):** Chiedi una carta aggiuntiva dal mazzo per aumentare il tuo punteggio. Puoi chiedere carta quante volte desideri, a patto di non superare i 21 punti.
* **Stai (Stand):** Decidi di fermarti con il punteggio attuale. Il tuo turno si conclude e la mano passa al giocatore successivo o al Banco.

---

## 5. Regola Obbligatoria del Banco (Dealer)
Il Banco non prende decisioni strategiche umane. È un automa vincolato dalle regole ufficiali dei casinò:
* **Deve tirare carta (Hit)** se il suo punteggio totale è **inferiore a 17**.
* **Deve fermarsi (Stand)** non appena il suo punteggio raggiunge o supera **17**.

---

## 6. Determinazione dei Risultati e Vincite
Al termine del turno del Banco, i risultati vengono calcolati per ogni singolo giocatore rimasto in gioco:
* **Blackjack Naturale:** Se ricevi un Asso e una figura/10 come prime due carte, hai un Blackjack naturale. Se il banco non ha un Blackjack a sua volta, vinci subito con un pagamento di **3:2** (1.5 volte la puntata).
* **Vittoria:** Il tuo punteggio è più alto di quello del Banco (senza aver superato 21), oppure tu sei in gioco e il Banco sballa. Guadagni il doppio della tua puntata virtuale (**1:1**).
* **Sconfitta:** Sballi (superi 21) oppure il tuo punteggio è inferiore a quello del Banco. Perdi la puntata virtuale.
* **Pareggio (Push):** Tu e il Banco ottenete lo stesso identico punteggio. La puntata virtuale ti viene interamente restituita.