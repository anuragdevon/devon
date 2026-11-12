---
title: "Tic-tac-toe"
subtitle: "It looks easy. That's the trap."
description: "Clean separation between board, players and rules, an O(1) win check with counters, undo from a move history, and how the same skeleton becomes Connect Four or Snake & Ladder."
date: 2026-11-12
track: lld
weight: 10
---

Nobody fails tic-tac-toe because the game is hard. They fail because the board knows about turns, the win check rescans everything, and adding a third player means rewriting the class. The interviewer is grading modelling, separation of concerns and extensibility, and the same skeleton carries over to most board-game questions.

> [!TIP] The short version
> - **`Board` knows nothing about players or turns;** `Game` owns the rules.
> - **Win check in O(1):** count each player's marks per row, column and diagonal.
> - **`Player` is an interface,** so humans and bots mix; the bot's brain is a strategy.
> - **Move history** gives undo and replay almost for free.

## Requirements

1. An N×N board (default 3), with 2 or more players, each with a symbol.
2. Players take turns placing their symbol on an empty cell.
3. Detect a **win** (a full row, column, or either diagonal) or a **draw**.
4. Reject invalid moves (out of bounds, occupied cell, wrong turn, game already over).
5. Extensible: different board sizes, more players, human or bot players, undo.

## Design

| Class | Responsibility |
|-------|----------------|
| `Board` | The grid state and placement validation. Knows nothing about players or turns |
| `Player` (interface) | `nextMove(Board)`: `HumanPlayer` (input) or `BotPlayer` (a strategy) |
| `WinningStrategy` | Detects a win after a move. O(1) per move using counters |
| `Game` | Turn order, game state (`IN_PROGRESS / WON / DRAW`), move history |
| `Move` | A value object (player, row, col) used for history and undo |

## Core code

```java
record Move(int playerIndex, int row, int col) {}
enum GameStatus { IN_PROGRESS, WON, DRAW }

class Board {
    private final int size; private final char[][] cells; private int filled;
    static final char EMPTY = '.';

    Board(int size) {
        this.size = size; cells = new char[size][size];
        for (char[] row : cells) Arrays.fill(row, EMPTY);
    }
    void place(int r, int c, char symbol) {
        if (r < 0 || c < 0 || r >= size || c >= size) throw new IllegalArgumentException("Out of bounds");
        if (cells[r][c] != EMPTY) throw new IllegalArgumentException("Cell occupied");
        cells[r][c] = symbol; filled++;
    }
    void clear(int r, int c) { cells[r][c] = EMPTY; filled--; }
    boolean isFull() { return filled == size * size; }
    int size() { return size; }
    char at(int r, int c) { return cells[r][c]; }
}

/** O(1) win detection: per player, count the marks in each row, column and both diagonals. */
class CounterWinningStrategy {
    private final int n;
    private final int[][] rows, cols;      // [player][index]
    private final int[] diag, anti;        // [player]

    CounterWinningStrategy(int n, int players) {
        this.n = n; rows = new int[players][n]; cols = new int[players][n];
        diag = new int[players]; anti = new int[players];
    }
    boolean recordAndCheck(Move m) { return update(m, +1); }
    void undo(Move m) { update(m, -1); }

    private boolean update(Move m, int delta) {
        int p = m.playerIndex(), r = m.row(), c = m.col();
        rows[p][r] += delta; cols[p][c] += delta;
        if (r == c) diag[p] += delta;
        if (r + c == n - 1) anti[p] += delta;
        return rows[p][r] == n || cols[p][c] == n || diag[p] == n || anti[p] == n;
    }
}

interface Player { String name(); char symbol(); int[] nextMove(Board board); }

record HumanPlayer(String name, char symbol, Scanner in) implements Player {
    public int[] nextMove(Board b) { return new int[]{in.nextInt(), in.nextInt()}; }
}

/** The bot is pluggable via a strategy: random, rule-based, or minimax for a 3x3 board. */
record BotPlayer(String name, char symbol, BotStrategy strategy) implements Player {
    public int[] nextMove(Board b) { return strategy.choose(b); }
}
interface BotStrategy { int[] choose(Board b); }

class Game {
    private final Board board; private final List<Player> players;
    private final CounterWinningStrategy winCheck;
    private final Deque<Move> history = new ArrayDeque<>();
    private int turn = 0; private GameStatus status = GameStatus.IN_PROGRESS; private Player winner;

    Game(int size, List<Player> players) {
        if (players.size() < 2) throw new IllegalArgumentException("Need at least 2 players");
        this.board = new Board(size); this.players = List.copyOf(players);
        this.winCheck = new CounterWinningStrategy(size, players.size());
    }

    /** Applies a move for the current player. */
    public GameStatus play(int row, int col) {
        if (status != GameStatus.IN_PROGRESS) throw new IllegalStateException("Game over: " + status);
        Player p = players.get(turn);
        board.place(row, col, p.symbol());                     // validates
        Move m = new Move(turn, row, col);
        history.push(m);
        if (winCheck.recordAndCheck(m)) { status = GameStatus.WON; winner = p; }
        else if (board.isFull()) status = GameStatus.DRAW;
        else turn = (turn + 1) % players.size();
        return status;
    }

    public void undo() {
        if (history.isEmpty()) throw new IllegalStateException("Nothing to undo");
        Move m = history.pop();
        board.clear(m.row(), m.col());
        winCheck.undo(m);
        status = GameStatus.IN_PROGRESS; winner = null;
        turn = m.playerIndex();
    }

    public void run() {                                        // a game loop for a CLI
        while (status == GameStatus.IN_PROGRESS) {
            Player p = players.get(turn);
            int[] mv = p.nextMove(board);
            try { play(mv[0], mv[1]); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        }
        System.out.println(status == GameStatus.WON ? winner.name() + " wins" : "Draw");
    }
}
```

## Design decisions to explain

- **Win check in O(1) per move** instead of scanning the board (O(N²)). Mention both and explain why the counters work.
- **`Board` knows nothing about players or turns**, and `Game` owns the rules. That's SRP, and it lets the board be reused across games.
- **`Player` is an interface,** so you can mix humans and bots. The bot's intelligence is a `BotStrategy`.
- **Move history (Command-like)** gives undo, replay and game persistence almost for free.

## Extensions

| Follow-up | Change |
|-----------|--------|
| Win with K in a row on an N×N board (K < N) | Replace the counter strategy with a check that scans outward from the last move in 4 directions, O(K) |
| Connect Four (gravity) | `Board.place(col)` finds the lowest empty row; the win check uses the 4-direction scan |
| Snake & Ladder | The same `Game`/`Player` skeleton; the `Board` has a `Map<Integer, Integer>` of jumps; a `Dice` strategy (fair or loaded) |
| Online multiplayer | `Game` becomes server-side state; moves arrive concurrently, so synchronise `play`, or process them through a per-game single-threaded queue; validate the player's identity per turn |
| Unbeatable bot | Minimax with alpha-beta pruning (feasible for 3x3) |
