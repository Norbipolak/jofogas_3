import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

dotenv.config();

class HTTP {
    private app:express.Application;

    constructor() {
        this.app = express();

        this.app.listen(process.env.SERVER_PORT);
        this.app.use(express.json()); //JSON típusú adatokat tudjunk majd fogadni!! 
        /*
            cookie-parse-rt külön telepíteni szükséges npm i cookie-parser !! 
            fontos, hogy be legyen importálva és fel legyenek dobva a típusai a terminálba beírni ami lejjebb van 
        */
        this.app.use(cookieParser());
        //és akkor már cookie-kat is tudunk kezelni, ami nagyon hasonló mint a session!!! 
        
    }

    /*
        1. paraméter: endpoint
        2. paraméter callback 
            Olyan callback function-t vár, aminek az első paramétere egy HTTP Request a második pedig egy HTTP Response
                cb:(req: Request, res: Response) => void 
    */

    public async get(path:string, cb:(req: Request, res: Response) => void) {
        this.app.get(path,cb);
        /*
            Ez teljesen, olyan, mint amit csináltunk, hogy ott is a express()-et elmentettük egy válzotóban (mondjuk ott is app)
            és ilyeneket írtunk, hogy app.get("/", (req, res)=> {})
            itt az a különbség, hogy az osztályban a változót definiáljuk majd a constructor-ban adunk neki értéket 
            meg az, hogy ez a függvény vár majd egy path-et meg egy cb-t és akkor nem kell mindig majd ezeket kiírni, hogy 
            app.get("/", (req, res)=> {}) hanem csak meghívjuk ezt a get-es függvényt és megadjuk neki a path-et meg a cb-t 
        */
    }

    public async post(path:string, cb(req:Request, res:Response) => void) {
        this.app.post(path, cb);
    }

    public async put(path:string, cb(req:Request, res:Response) => void) {
        this.app.put(path, cb);
    }

    public async delete(path:string, cb(req:Request, res:Response) => void) {
        this.app.delete(path, cb);
    }

    public async patch(path:string, cb(req:Request, res:Response) => void) {
        this.app.patch(path, cb);
    }

    /*
        És így már el tudjuk készíteni az összes endpoint-ot 
        de fontos, hogy a constructor-ban legyen egy ilyen, hogy this.app.use(express.json());
    */
}   

const http = new HTTP();
export default http;
//és ilyenkor majd az index-re vagy ahol dolgozunk majd ott ezt importáljuk és meg lehet hívni a függvényeket amit itt csináltunk 

/*
    Itt nem is azt csináljuk, hogy export default HTTP, hanem majd csak egy példányt fogunk visszaadni, hogy ne legyen több ilyen 
    HTTP akármink 

    Itt amit beimportálunk az az express -> import express from "express";

    Csinálunk egy constructor-t és létrehozunk egy private app változót 
    -> 
    private app:express.Application;

    constructorban meg értéket adunk neki 
    ->
    constructor() {
        this.app = express();
    }

    Itt majd csinálunk cross-origin-es dolgokat, meg statikus fájlos dolgokat
*/

/*
    Ha alá van húzva a Request meg a Response amit importáltunk az express-ből, akkor egy ilyet kell beírni a terminálba
    ->
    npm i --save-dev @types/express !!! 
    Tehát itt az express-nek a típusait is fel kell telepíteni, hogy felismerje, hogy ilyenek vannak 

    Meg ugyanígy feltelepítjük a dotenv-et, hogy ebből ne legyen probléma 
    -> 
    npm i --save-dev @types/dotenv !!!

    telepítettünk egy cookie-parser-t (npm i cookie-parser), ezt be is importáltuk -> import cookieParser from "cookie-parser" 
    illetve erre is kell, hogy felismerje 
    ->
    npm i --save-dev @types/cookie-parser 
*/

/*
    Ez a GET kéréshez nagyon hasonlóak lesznek a POST, PUT stb. 
*/


