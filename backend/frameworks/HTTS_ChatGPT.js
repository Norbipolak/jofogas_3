import express, { Application, Request, Response } from "express";

class HTTP {
    private app: Application;
    private port: number;

    constructor(port: number = 3000) {
        this.app = express();
        this.port = port;
        this.middlewares();
        this.routes();
    }

    private middlewares(): void {
        // Middleware for parsing JSON requests
        this.app.use(express.json());
    }

    private routes(): void {
        // Basic route for testing
        this.app.get("/", (req: Request, res: Response) => {
            res.send("Server is running!");
        });
    }

    public start(): void {
        this.app.listen(this.port, () => {
            console.log(`Server is running on http://localhost:${this.port}`);
        });
    }
}

// Create a new instance and start the server
const server = new HTTP(3000);
server.start();

/*
Port paraméter: 
A kódban egy alapértelmezett portot adunk meg (3000), amit a constructor-ban állítunk be. 
Így rugalmasan megváltoztatható, ha más porton szeretnéd futtatni a szervert.

Middleware és útvonalak: 
A middlewares és routes metódusokat külön definiáljuk, hogy a kód áttekinthetőbb és jobban szervezett legyen. 
A middlewares metódusban hozzáadjuk az express.json() köztes szoftvert, amely JSON típusú kérések feldolgozását teszi lehetővé. 
A routes metódusban pedig beállítunk egy alap útvonalat (/), amely visszaad egy egyszerű üzenetet, hogy a szerver működik.

start metódus: 
A start metódus elindítja a szervert, és kiír egy üzenetet, amely megmutatja, 
hogy a szerver melyik porton fut (pl. http://localhost:3000).
*/ 
