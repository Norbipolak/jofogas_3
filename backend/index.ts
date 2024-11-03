/*
    a .env file szerint már tudunk csatlakozni az adatbázishoz 
    DB_HOST=127.0.0.1
    DB_USER=root 
    DB_PASS=
    DB_NAME=jofogas_clone ... 

    És ide az első dolog, hogy be kell importálni a pool-t amit csináltunk!! Conn.ts-en 
    ->
    import pool from "./backend/frameworks/Conn.js";
    és nem felejtjük el odaírni, hogy .js utána!!! 
*/
import { PoolConnection, Query } from "mysql2";
import pool from "./frameworks/Conn.js";
import http from "./frameworks/HTTP.js";
import { Request, Response } from "express";
import SqlQueryBuilder from "./frameworks/sqlQueryBuilder.js";
import { joinTypes } from "./app/models/types.js";

async function getSomething():Promise<void> {
    /*
        Ha a limit szerint még van szabad connection, akkor abból kiveszük egyet
        és felhasználjuk!! 
        Ha nincsen, akkor addig várunk a beállításunk szerint, ameddig nem lesz 
        Ez volt a -> waitForConnections: true 
            Tehát nem dobja el a kérést, hanem addig vár, ameddig nem lesz szabad 
    */
    const conn:any = await pool.promise().getConnection();

    const response:Query = await conn.query("SELECT * FROM users");
    console.log(response);
}



http.get("/something", (req:Request, res:Response)=> {
    res.status(200).json("{importantData:123");
});


//Az SqlQueryBuilder-ből csinálunk egy példányt!! SqlQueryBuilder.ts
const qb:SqlQueryBuilder = new SqlQueryBuilder();
//és onnan meghívjuk a public függvényeket, pl. a select-et, ami összerak nekünk egy sql stringe-t
//ez vár egy table-t meg egy fields-t, ami egy array lesz és azt a select függvényen belül join-oltuk vesszők mellett 
qb.select("users", ["userID", "email", "pass"]);

/*
    És mivel ezek a függvények egy this-t adnak vissza, egy SqlQueryBuilder-t, tehát önmagát adja vissza!!! 
    -> 
    public select(table:string, fields:string[]):SqlQueryBuilder*** {
        this.sql += `SELECT ${fields.join(", ")} FROM ${table}}`
        return this;***
    }
    Tehát ebből meg tudjuk hívni az összes metódust, ilyen chain-elős (lácolásos) megoldás!! 

    de viszont itt jön egy probléma, hogy nem mindig amikor WHERE van, akkor = jel is
    ezért be kell azt is kérni és itt meghívásnál megadni 
    
    public where(field:string, value:string):SqlQueryBuilder {
        this.sql += `WHERE ${field} = ?`
        this.values.push(value);
        return this;
    }

    ->

    public where(field:string, operation:string****, value:string):SqlQueryBuilder {
        this.sql += `WHERE ${field}  ${operation}?`****
        this.values.push(value);
        return this;
    }

    Most itt meghívásál egy = lesz, de azt is megcsinálhatnánk, hogy LIKE 
    ->
    qb.select("uesrs", ["userID", "email", "pass"]).where("email", "=", "");
    qb.select("uesrs", ["userID", "email", "pass"]).where("email", "LIKE", "");

    Ebből meg tudjuk hívni a getSql-t 
        és mivel az utolsó getSql, ezért ez már nekünk egy sql string-et fog visszaadni 

    public getSql():string {
        return this.sql;
    }

    qb.select("users", ["userID", "email", "pass"]).where("email", "=", "").getSql()***;
    

*/

let sql = qb.select("uesrs", ["userID", "email", "pass"]).where("email", "=", "").getSql();
console.log(sql);
/*
SELECT userID, email, pass FROM users WHERE email = ?
És ha ezt egyszer megcsináltuk, akkor nincsen több hibázási lehetőség, hogy azt írjuk, hogy SELCET mondjuk, hanem csak egyszer kell 
    figyelni, amikor megcsináljuk ez a select függvényt!! és akkor azt meg lehet hívni 
*/

//insert()-nek a meghívása
let sql1 = qb.insert("users", {
    "email":"asdf@asdf.hu",
    "pass":"asdf",
    "isAdmin":0
}).getSql;
/*
    INSERT INTO users (email, pass, isAdmin)
    VALUES(?,?,?)
    Ha meg akarjuk nézni, hogy mi van a values-ban, akkor azt ki kell loggolni 
    -> 
        public insert(table:string, fieldsValues:Record<string, any>):SqlQueryBuilder {
            ...
            VALUES(${getQuestionMarks(Object.keys(fieldsValues))})`

            this.values.push(...Object.values(fieldsValues));
            console.log(this.values);***** -> ['asdf@asdf.hu', 'asdf', 0]
*/

let sql3:string = qb.select("users", ["users.userID", "users.email"]) 
.join(joinTypes.INNER, "ratings", ["users.userID", "ratings.userID"]).getSql();
console.log(sql3);
/*
    SELECT userID, email FROM users INNER JOIN ratings ON users.userID = ratings.userID

    let sql3:string = qb.select("users", ["userID", "email"]) 
    És ha itt esetleg kétértelmű mezők vannak, mert a mindkét táblában ugyanaz a mezőnév, akkor azt tudjuk itt mondani, hogy 
    ->
    let sql3:string = qb.select("users", ["users****.userID", "users****.email"]) 
************************************************************************************************************************************
*/

//példa Object.keys()-re meg a join()-ra 
const user = {
    userID:1, 
    email:"asdf@asdf.hu",
    pass:"titkosjelszó"
}

//az Object.keys() az összes key-t visszaadja az adott objektumnak amit megadunk, és ezek egy tömbben lesznek 
const keys = Object.keys(user);
console.log(keys); //['userID', 'email', 'pass']

/*
ha pedig végigmegyünk egy map-val a keys-eken, akkor meg lehet változtatni a keys, mint itt, hogy hozzáadunk valamit 
vagy minden egyes körben a map ? rak bele, amit csináltunk és akkor lesz egy tömb annyi kérdőjellel, mint amennyi eleme van annak a dolognak 
    amin végigmentünk 
Tehát, ami fontos a map()-nál, hogy ne módosítja az eredeti array-t, hanem létrehoz egy újat!! 
    ezért mentjük el egy új változóban, mint itt, hogy const fields
*/
const fields = keys.map(k=> `${k} = ?`);
console.log(fields); //['userID = ?', 'email = ?', 'pass = ?']

//ha pedig ezt join-oljuk össze egy , mentén, akkor kapunk egy string-et és nekünk erre van szükségünk 
console.log(fields.join(", ")); //'userID = ?, email = ?, pass = ?'

/******************************************************************************************************************************/
//execute, amit csináltuk meg a többi dolog a SqlQueryBuilder-nek a tesztelése, meghívása
async function insertSomething() {
    //példányosítunk, hogy hozzáférjünk a dolgokhoz, amiket csináltunk a SqlQueryBuilder.ts-ben 
    const qb:SqlQueryBuilder = new SqlQueryBuilder();
    const user = {
        isAdmin:0,
        email:'asdf2@asdf.hu',
        pass: 'asdf',
        firstName: "János",
        lastName: "Szabo"
    };
    /*
    insert vár egy table-t, most a users-be akarunk felvinni dolgokat 
    és egy fieldsValues-t ami egy objektum kell, hogy legyen és ezt meg is csinájuk itt 
    -> 
        const user = {
        isAdmin:0,
        email:'asdf@asdf.hu',
        pass: 'asdf',
        firstName: "János",
        lastName: "Szabo"
    }
    és ezt be is dobjuk az insert-nek -> insert("users", user***)

    execute-ot meg mindig meg kell hívni 
    Mert azt csinálja a execute, hogy megpróbálja lefutatni a lekérdezést amely a this.sql változóban van tárolva 
    a this.values értékeivel a this.conn kapcsolat segítségével
    Visszaadja a lekérdezés eredményét (response[0]) vagy ha hiba történik, akkor azt elkapja és közvetlenül visszaadja a hibát 
    -> 
    const result:QueryResult = await qb.insert("users", user).execute()***

    De ezt majd be kell tenni egy try-catch blokkba
    mert ahol csináltuk a execute-ot, ott throw-olunk majd tovább a hibát ha van 
    és itt meg ebben a try-catch-ben pedig elkapjuk és console.log-oljuk 
    ->
    SqlQueryBuilder.ts
            } catch(err:any) {
                throw err;
    itt az index.ts
            } catch(err) {
                console.log(err);
    }
    */


    try {
        await qb.beginTransaction();
        const result:any = await qb.insert("users", user).execute();
        const result2:any = await qb.insert("ratings", {userID:result.insertId, rate:5}).execute();
        await qb.commit();
        console.log(result);
    } catch(err) {
        await qb.rollBack();
        console.log(err);
    }

    /*
        És ha meg akarjuk hívni a függvényt és megnézni, hogy mi a console.log(result) 
        akkor le kell fordítani a file-t ts-t js-re 
        ->
        tsc --watch --target ES2022 (a terminálba ezt kell beírni) 
    */
}

insertSomething();

/*
    INSERT már meg van (leírás SqlQueryBuilder) SELECT 
    const qb:SqlQueryBuilder = new SqlQueryBuilder();
    fontos, hogy ez ki legyen hova példány mindig, mert most csak a insertSomething-ban van de ezt ki kell hozni globális 
    változónak, hogy itt a getUser-ben is tudjuk használni a dolgokat, amiket csináltunk a SqlQueryBuilder-ben!! 
*/



async function getUsers() {
    try {
        //lekérdezünk mindent a users-ből!!! -> ["*"]
        const response:Record<string, any>[] = await qb.select("users", ["*"]).like("email", "%szabo%", "where").execute() as Record<string, any>[];
        console.log(response);
    } catch(err) {
        console.log(err);
    }
}

getUsers();

/*
    Ezt kaptuk vissza a console.log(response)-ra 
    [
        {
            userID: 2, 
            isAdmin: 1, 
            email: 'szabo2.janos@gmail.com',
            pass: 'asdfasdf',
            firstName: 'János',
            lastName: 'Szabó',
            created: 2024-10-28....
            updated: null
        }
    ]

    public async execute():Promise<ResultSetHeader>|Record<string, any>[] {
    és fontos, hogyha execute van meghívva az insert-nél, akkor visszakapunk egy Promise<ResultSetHeader>-t 
    ha meg select van, mint jelen esetben, akkor meg egy Record<string, any>[]
    Mert ebben ahogy fent is van kulcs-értékpárokkal rendelkező objektumok vannak (most csak egy objektum, mert csak egy rekord van felvéve a userbe)
    és ez ezeknek az array-e, tehát itt ezt vissza tudjuk kapni
    ->
    const response:Record<string, any>[] = await qb.select("users", ["*"]).execute();
    Így még kapni fogunk egy hibát, mert azt mondja, hogy ez lehet ResultSetHeader is ezért kell az AS!!!  
    ->
    const response:Record<string, any>[] = await qb.select("users", ["*"]).execute() as Record<string, any>[]; !!!! 

    Itt kellene megnézni, hogy müködik az, hogy WHERE vagy LIKE 
    de még nincs is ilyen, hogy LIKE, ezért csinálunk egyet az SqlQueryBuilder-ben 

        public like(field:string, andOrWhere:string,  value:string):SqlQueryBuilder {
        this.sql += `${andOrWhere} ${field} LIKE ? `; 
        this.values.push(value);
        return this;
    }
    A lekérdezésnek úgy kell kezdődnie, hogy WHERE vagy AND és utána jőn a field = ? 
    ->
    const response:Record<string, any>[] = await qb.select("users", ["*"]).*****like("email", "%szabo%", "where").execute() as Record<string, any>[];
    ****
    
    Megtervezzük a többi részét a projektnek 
    Lesz a framework-ben egy Model.ts
*/

