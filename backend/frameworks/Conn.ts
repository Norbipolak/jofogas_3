
/*
    Ha a backend-be akarunk valamit feltelpíteni, akkor azt kell a terminálba beírni, hogy cd backend
    -> 
    PS C:\Users\Norbert\Repository\jofogas_1> cd backend
    PS C:\Users\Norbert\Repository\jofogas_1\backend> 

    Ezeket a dolgokat kell, hogy feltelepítsük a project-hez 
    -> npm i npm i express mysql2 cors crypto dotenv

    de ezelött nagyon fontos, hogy meg legyen az npm init, hogy meg legyen a package-lock.json meg a package.json file-unk!! 
      "name": "backend",
        "version": "1.0.0",
        "lockfileVersion": 3,
        "requires": true,
        "packages": {
            "": {
            "name": "backend",
            "version": "1.0.0",
            "license": "ISC",
            "dependencies": {
                "cors": "^2.8.5",
                "crypto": "^1.0.1",
                "dotenv": "^16.4.5",
                "express": "^4.21.1",
                "mysql2": "^3.11.3"

    És csak ezután kell feltelepíteni a cors, dotenv stb, mert ezek ebben a file-ban lesznek -> dependencies
*/
// import mysql2, { ConnectionConfig } from "mysql2";

// class Connection {
//     private static conn:ConnectionConfig
// }

/*
    Ami biztos, hogy kell nekünk egy connection, az adatokat meg a .env file-ból szedjük majd 
    -> 
    DB_HOST=127.0.0.1
    DB_USER=root 
    DB_PASS=
    DB_NAME=jofogas_clone
    SERVER_PORT=3001 **
    CLIENT_PORT=3000 **

    Az fontos ilyenkor, hogy a kliens, mivel a React az alapértelmezetten a 3000-es porton fut, emiatt a szerver az nem futhat a 3000-es
    porton, hanem egy másikon kell neki!!! 
        Most erre a 3001-es port-ot választjuk 

    Mielött beimportáljuk ide a mysql2-t meg ezeket azelött fontos, hogy a package.json file-ban -> "type":"module",

    Mivel ts fájlban dolgozunk, ezért fontos, hogy meg legyenek határozva a változóknak a típusai 
    -> 
    class Connection {
        private static conn:ConnectionConfig
    }
    És vannak ilyen beépített változótípusok, hogy ConnectionConfig 

    De ezt máshogy fogjuk megcsinálni, egy PoolOptions-os megoldással 
    Ez azt jelenti, hogy több connection-t, tehát adatbáziskapcsolatot tart fent, de ezeket újrahasználja vagy újrahasznosítja 
    Ez azért jó, mertha egyszerre érkeznek be a kérések, akkor nem kell egy connection-nek kivárnia, a következőt 
    !!!!!!!!!!!!!!!!!!!
*/

import mysql, { PoolOptions, Pool } from "mysql2";
import dotenv from "dotenv";

dotenv.config();
/*
    Ez nagyon fontos, hogy az adatokat, melyikeket a .env file-ban csináltunk, azokat ide be akarjuk majd hívni, de ehhez kell, hogy 
    a dotenv be legyen importálva és még az is, hogy meg legyen hívva belőle a .config() metódus 
    ->
    import dotenv from "dotenv";
    dotenv.config()

    És ami nagyon fontos, hogy így tudjuk megszerezni az értékeket a dotenv file-ból, hogy process.env valami 
    -> 
    host: process.env.DB_HOST,

*/


    //A connection pool képes több adatbáziskapcsolatot fenntartani az adatbázissal és ezeket újrafelhasználni

    //A megengedett adatbáziskapcsolatok száma limitálva van és emiatt szükséges nekünk is egy connection limit-et beállítani 


const poolOptions: PoolOptions = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    waitForConnections: true,//várakozik-e a kliens ha nincsen elérhető connection 
    //connectionLimit: 10,//hány adatbáziskapcsolat lehet összesen 
    connectionLimit: parseInt(process.env.DB_CONN_LIMIT as string),
    queueLimit: 0
}

/*
    Most a process azért van aláhúzva, mert nem ismeri fel a típusát a typescript 
    ->
    npm i --save-dev @types/node
    Ha ezt beírjuk a terminálba, akkor így már jó lesz 

    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306, **

    Ez a rész az teljesen ugyanaz, mint a sima connection-nél voltak 
    ** DB_PORT=3306 .env-be még belerakjuk ezt, ha ez esetleg valahol más, akkor majd meg lehet változtatni!! 

    1. waitForConnections: true,
    Ha nincsen elérhető connection-ünk, akkor várakoztatja azt a kérést, amelyiknek nincsen connection-je, mert nem jut neki 

    2. connectionLimit: 10,
    Hány adatbáziskapcsolat lehet összesen 
    Ezt azért fontos limitálni, mert a megengedett adatbáziskapcsolat száma a szerverbeállítások szerint limitálva van!! 
    És ha mi ezt túllépjük, akkor kapunk egy kivételt és meg is áll a kódunk!! 
    De ez úgy lehetne még jobban beállítani, hogy az .env fájlunkban csinálunk egy ilyet -> DB_CONN_LIMIT=10
        Ennek localhost-on azért nincsen jelentősége, mert localhost-on egyetlen egy felhasználó fogja ezt használni (mi) tesztelésre
        De ha ez a projekt kikerülne élesbe, akkor már lenne értelme 

    ->
    connectionLimit: process.env.DB_CONN_LIMIT,
    Ez így nem lesz jó, mert parseInt()-elni, kell 
    -> 
    connectionLimit: parseInt(process.env.DB_CONN_LIMIT)
    de ez még mindig nem lesz jó, emrt azt mondja, hogy Argument type 'string/undefined' is not assignable to parameter of type 'string'
    Mert ez undefined is lehet, mert nem tudja, hogy ezt mi beállítottuk, hogy 10 az értéke (DB_CONN_LIMIT=10)
        és az undefined-et pedig nem tudjuk int-é változtatni 
    Ezért azt kell mondani, hogy as string!!!!!! 
    ->
    connectionLimit: parseInt(process.env.DB_CONN_LIMIT as string),
    Tehát string-é kell alakítani ,hogy parse-olni lehesen!!!!!! 

    Tehát a .env változók lehetnek undefined-ek is, emiatt szükséges string-é konvertálni őket az 'as' operátorral!!!!!!! 
    hogy utána lehessen parse-olni őket 
        parse-olás az amikor string-ből változtatunk valami másmilyen típusra!!! 
    Tehát az 'as' operátor az egy típus konverzió!!!! 
*/

const pool:Pool = mysql.createPool(poolOptions);
//ha megadunk egy ilyen típust, hogy Pool vagy hasonló, akkor ez a mysql2-ből importálva lesz -> import mysql, { PoolOptions, Pool } from "mysql2";
export default pool;

/*
    Mi ez a pool 
    -> 
    Ez ami biztosítja a connection-öket, az adatbáziskapcsolatokat, ebből fogjuk majd kiszedni az adatbáziskapcsolatokat!! 

    Erre lesz egy példa, hogy csinálunk egy index.ts-t 
*/