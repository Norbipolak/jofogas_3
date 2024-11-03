/*
    Itt importálni kell az adatbáziskapcsolatot 
*/
import { QueryResult, ResultSetHeader } from "mysql2";
import { joinTypes } from "../app/models/types.js";
import pool from "./Conn.js";
import getQuestionMarks from "./getQuestionMarks.js";

class SqlQueryBuilder {
    private sql:string;
    private conn:any;
    private values:any[];
    private inTransaction:boolean;

    constructor() {
        //this.getConnection();  ezt nem itt fogjuk megcsinálni, hanem az execute függvényen belül!!!! 
        this.values = [];
        this.sql = "";
        this.inTransaction = false;
    }

    /*
            Fontos, hogy ezek async-ek legyenek és await-elni kell!! 
    */

    public async beginTransaction() {
        if(this.inTransaction) {
            throw "There is an active transaction under execution!";
        }
        this.inTransaction = true;
        this.conn = await pool.promise().getConnection();
        await this.conn.beginTransaction();
    }

    public async commit() {
        await this.conn.commit();
    }

    public async rollBack() {
        try { await this.conn.rollback(); this.conn.release(); } catch(err) { 
            console.log("SqlQueryBuilder.rollBack", err); 
        }
    }

    // public async getConnection():Promise<void> {
    //     itt megszerezzük a connection-t, de ezt fontos, hogy meg kell hívni a constructor-ben!!! 
    //     this.conn = await pool.promise().getConnection();
    // }

    /*
        table -> tábla, amiből le akarunk kérdezni 
        field(values) -> egy objektum, kulcs-értékpárokkal (pl. {id: 1, userName: "asdfasdf"})
        De ez majd csak a insert-nél is mivel most egy select van ezért -> Record<string, any>
        a table:string mellett van egy fields, ami egy string array -> fields:string[]
        fields -> string array, a lekérdezendő mezőkkel 
    */

    public select(table:string, fields:string[]):SqlQueryBuilder {
        //elő kell állítani egy sql string-et 
        //mert a fields az egy tömb, amiben vannak a mezők, de mi itt azt akarjuk, hogy egymás mellett fel legyenek sorolva string-ként 
        //fields.join(", ")

        this.sql += `SELECT ${fields.join(", ")} FROM ${table}} `;
        return this;

        /*
            Ha azt mondjuk, hogy return this, akkor azt lehet csinálni, hogy létrehozunk egy public where és majd össze lehet füzni őket!! 
        */
    }

    public where(field:string, operation:string, value:string):SqlQueryBuilder {
        /*
            két dolgot vár, mert egy where az úgy néz ki, hogy meg kell adni, hogy minél (field) mi legyen az érték (value) 
            pl. WHERE userName = "asdfasdf"
            de mivel itt mi prepared statement-ekkel dolgozunk, ezért így lesz 
            ->
            `WHERE ${field} = ?`
            de akkor hova megy a value 
            -> 
            létrehozunk egy private values, ami egy tömb lesz és any értéket tud fogadni -> private values:any[];
            de minden változónak amit létrehoztunk kell adni egy értéket a constructor-ban 
            ezért a values-nak az értéke egy üres tömb lesz! 
            ->
                constructor() {
            this.getConnection();
            this.values = [];   ****
            this.sql = ""; ennek az értéke meg egy üres string, amihez hozzáfüzzük majd a dolgokat, amiket itt csinálunk -> this.sql += 
                ha valamilyen változónak a constructor-ban nem adunk értéket, akkor az undefined lesz és abból probléma lesz 
            }
        */
        //hozzáfüzzük az sql változóhoz 
        this.sql += `WHERE ${field} ${operation} ? `;
        //a values-ba meg belerakjuk a value-t, amit bekér a függvény és majd meghatározunk meghívásnál 
        this.values.push(value);

        //és ez is egy SqlQueryBuilder-t fog visszaadni és azt mondjuk, hogy return this
        return this;
    }

    public getSql():string {
        return this.sql;
    }

    public and(field:string, operation:string, value:string):SqlQueryBuilder {
        this.sql += `AND ${field} ${operation} ? `; //itt fontos, hogy hagyni kell egy szóközt, mert összefűzésnél nehogy egybe legyen a kettő
        this.values.push(value);
        return this;
    }

    public like(field:string, andOrWhere:string,  value:string):SqlQueryBuilder {
        this.sql += `${andOrWhere} ${field} LIKE ? `; 
        this.values.push(value);
        return this;
    }

    public or(field:string, operation:string, value:string):SqlQueryBuilder {
        this.sql += `OR ${field} ${operation} ? `;
        this.values.push(value);
        return this;
    }

    public in(field:string, values:any[], andOrWhere:string):SqlQueryBuilder {
        this.sql += `${andOrWhere} ${field} IN(${values.map(v=>"?").join(",")}) `;
        this.values.push(...values);
        return this;
    }

    public between(field:string, values:[any, any], andOrWhere:string):SqlQueryBuilder {
        this.sql += `${andOrWhere} ${field} BETWEEN ? AND ?}} `;
        this.values.push(...values);
        return this;
    }
    
    public insert(table:string, fieldsValues:Record<string, any>):SqlQueryBuilder {
        this.sql += `INSERT INTO ${table} 
        (${Object.keys(fieldsValues)}) 
        VALUES(${getQuestionMarks(Object.keys(fieldsValues))})`

        this.values.push(...Object.values(fieldsValues));
        console.log(this.values);
        return this;
    }

    public join(joinType:joinTypes, table:string, fields:[string, string]):SqlQueryBuilder {
        this.sql += `${joinType} ${table} ON ${fields[0]} = ${fields[1]} `;
        return this;
    }

    //JOIN-ból lehet alapból egy olyat csinálni, hogy INNER JOIN-os 
    public innerJoin(table:string, fields:[string, string]):SqlQueryBuilder {
        return this.join(joinTypes.INNER, table, fields);
    }
    //és ha az innerJoin-t hívjuk meg akkor nem kell beírni, hogy mi a joinType, mert abban meg van hívva a join és ott megadtuk neki!! 

    //ugyanígy lehet right és left join-os is 
    public leftJoin(table:string, fields:[string, string]):SqlQueryBuilder {
        return this.join(joinTypes.LEFT, table, fields);
    }

    public rightJoin(table:string, fields:[string, string]):SqlQueryBuilder {
        return this.join(joinTypes.RIGHT, table, fields);
    }

    /*
        tárolt eljárások 
        Ez egy olyasmi, mint a function a JavaScriptben, várhat majd paramétereket 

        Ez a callProcedure függvény egy SQL eljárás meghívását könnyíti meg a kódban 
        1. Paraméterek 
            A függvény két paramétert fogad: name, ami egy karakterlánc és az eljárás neve 
            valamint values, ami egy tömb, és az eljárásnak átadandó értékeket tartalmazza 

        2. SQL parancs összeállítása 
            A this.sql változóhoz hozzáfüzi az SQL hívást a call kulcsszóval, amely SQL-ben egy tárolt eljárás meghívására szolgál!!! 
            getQuestionMarks(values) függvény egy ? jeleket tartalmazó karakterláncot csinál, amelyek helyőrzőként müködnek az SQL 
            eljárás hívásakor, a values elemeinek számától függően (pl. 3 elem esetén "?,?,?" lesz a generált string) 

        3. Értékek hozzáfűzése 
            A this.values.push(...values) sor hozzáadja a megadott values értékeket egy már létező values tömbhöz, amely késöbb 
                az SQL lekérdezés paramétereiként lesz használva

        4. Lácolhatóság biztosítása!!! 
            A függvény return this; utasítással tér vissza, amely lehetővé teszi, hogy a további metódusokat hívjunk meg 
            közvetlenül ugyanazon objektumon láncolva!! 
    */

    public callProcedure(name:string, values:any[]) {
        this.sql += `call ${name}(${getQuestionMarks(values)}) `;
        this.values.push(...values);
        return this;
    }
    
    public update(table:string, fieldsValues:Record<string, any>):SqlQueryBuilder {
        /*
            Hogyan állítsuk elő a values-ból a mező1 = ?, mező2 = ? ami a SET után van ->  `UPDATE ${table} SET mezo1 = ?, mezo2 = ?`
                és ezt méghozzá a fieldValues alapján 

                Létrehozunk egy változót (fieldsArray) és a fieldsValues-nak a kulcsain végigmegyünk egy map-vel!! 
                és mindig azt fogjuk hozzá füzni, hogy a key = ?, mert ugye a mező az a key a fieldsValues-ban és nekünk az kell itt 
                    mezo1 = ?, mezo2 = ?
                const fieldsArray:string[] = Object.keys(fieldsValues).map(key=> `${key} = ?`)
                Mert ez azt fogja csinálni, hogy egy tömbbe fogja gyüjteni ezeket `${key} = ?`, hogy '[mezo1 = ?', 'mezo2 = ?']
                    ezért az fieldsArray az egy string array lesz 
                Átnevezzük a fielsArray fieldsString-re és nem egy string array fog visszaadni, hanem egy string-et, mert join()-olunk egyet!! 
                ->
                const fieldsString:string = Object.keys(fieldsValues).map(key=> `${key} = ?`).join(", ");

                példa erre az index.ts-ben

                SET után pedig megadjuk a fieldsString-et amit most csináltunk -> SET ${fieldsString}

                Update-nél általában szokott olyan lenni, hogy WHERE valami = ? AND valami2 = ? 
                Ezért bekér a függvény még egy whereValues-t is -> whereValues:Record<string, any>
                de ezt hagyjuk, mert ha van ilyen, akkor meghívjuk ebből a függvényből a where-t vagy/meg a and-et amiket itt csináltunk feljebb

        */
        const fieldsString:string = Object.keys(fieldsValues).map(key=> `${key} = ?`).join(", ");
        this.sql += `UPDATE ${table} SET ${fieldsString} `;
        return this;
        //return this, hogy tudjunk majd chain-elni, mert itt lehet majd utána a where vagy az and .. 
    }

    /*
        Egy végrehajtásra (execute)-ra van szükség, ami már async!! 
        Van egy connection itt az osztályban, mert ezt csináltuk meg így 
        ->
        class SqlQueryBuilder {
            private sql:string;
            private conn:any;***********
            private values:any[];

        constructor() {
            this.getConnection();***********
            this.values = [];
            this.sql = "";
            }

    public async getConnection():Promise<void> {*********
        //itt megszerezzük a connection-t, de ezt fontos, hogy meg kell hívni a constructor-ben!!! 
        this.conn = await pool.promise().getConnection();
    }
    */
    public async execute():Promise<ResultSetHeader>|Record<string, any>[] {
        try {
            /*
                Itt megcsináljuk a connection és nem felül 
            */
            if(!this.inTransaction)
                this.conn = await pool.promise().getConnection();
            /*
            tehát itt van meg a collection és ha megcsináljuk a response-os dolgot, akkor release()
            elengedjük ezt a conn-t szabaddá tesszük 
            */
            const sql = this.sql;
            const values = this.values;
            this.sql = "";
            this.values = [];
            const response = await this.conn.query(sql, values);
            this.conn.release();
            /*
                Tehát van egy connection (conn) annak van egy query-je és ott megadjuk az sql-t ami el van tárolva 
                a constructorban attól függően, hogy az mi insert update stb. és megadjuk a this.values-t 
                ott meg el van tárolva amit belepushol-tuk 
                ->
                between(field:string, values****:[any, any], andOrWhere:string):SqlQueryBuilder {
                    this.sql += `${andOrWhere} ${field} BETWEEN ? AND ?}} `;
                    this.values.push(...values);  ****
                    return this;
                Tehát annyi, hogy a query-ben megadjuk az sql string-et meg values-t, ahol az értékek vannak!! 
                
                És itt meg visszaadjuk, hogy response[0]
                ugye ez a response visszaad egy QueryResult-ot meg egy Fields-et 
                a response[0] meg a QueryResult lesz 
                ->
                public async execute():Promise<QueryResult|any>*** 
                //Tehát ez a függvény visszaad egy QueryResult-ot (response[0]) vagy egy any-t, ha hiba van és catch ág -> catch(err:any)
                    try {
                        const response:QueryResult***

            */
            
        } catch(err:any) {
            /*
                Itt az error kell visszaadni, de hogy mi legyen a formátuma, de csak visszaadjuk simán az err-t -> return err;
            */
            throw err;
        }
    }

    //leteszteljük az index-en, hogy ez most hogyan müködik
    
    /*
        A connection máshogy fogjuk majd csinálni 
        Nem így, ahogy eddig volt
        -> 
        private conn:any;
        ...

            constructor() {
                this.getConnection();
                ...
            }

    public async getConnection():Promise<void> {
        //itt megszerezzük a connection-t, de ezt fontos, hogy meg kell hívni a constructor-ben!!! 
        this.conn = await pool.promise().getConnection();
    }

    try {
        const result:QueryResult = await qb.insert("users", user).execute();
        console.log(result);

    és egy ilyet kapunk majd vissza a result-ra, hogy 
        ResultsHeader {
            fieldCount: 0, 
            affectedRows: 1, 
            insertId: 9, 
            info: '',
            serverStatus: 0,
            warningStatus: 0, 
            changedRows: 0 
        }

    Amit meg kell jegyezni, hogy így szerezünk connection-t 
    1. await 
    2. pool.
    3. promise()
    4. getConnection()
    this.conn = await pool.promise().getConnection()

    És ahol csináljuk a query-t, ott nem lesz promise csak query! 
    1. await
    2. this.conn.
    3. query()
    const response:QueryResult = await this.conn.query(this.sql, this.values);
        this.sql meg a this.values egy változók, aminekben el van mentve érték a constructor-ben  

    A legvégén meg, hogy elengedjük a conn-t és fel tudja használni majd egy másik kérés conn.release()-elni kell!! 
    ******
    Itt felül megoldjuk, hogy müködjön a beginTransaction rollback meg ezek a dolgok!! 
    public async beginTransaction() {
        await this.conn.beginTransaction();
    }

    public async commit() {
        await this.conn.commit();
    }

    public async rollBack() {
        try { await this.conn.rollback(); } catch(err) { 
            console.log("SqlQueryBuilder.rollBack", err); 
        }
    }

    és megnézzük az index-en, hogy müködik ez a dolog, hogy be tudjuk hívni ezeket a függvényeket ott!! 
    
    try {
        await qb.beginTransaction();***
        const result:QueryResult = await qb.insert("users", user).execute();
        await qb.commit();***
        console.log(result);
    } catch(err) {
        await qb.rollBack();***
        console.log(err);
    }

    De ez így nem lesz jó, mert itt nem lesz conn, mert azt nem a constructor-ban lesz meg, mint eddig, hanem az execute-ban 
    és ezek a függvényekben, hogy beginTransaction(), commit() nem férünk hozzá a conn.-hoz!! 
    Tehát az itt szedjük le 
    -> 
        public async execute():Promise<QueryResult|any> {
        try {
            this.conn = await pool.promise().getConnection();

    Ezért hagyjuk az index-en amit most csináltunk, hogy meghívjuk, hogy commit meg ezeket a dolgokat!! 

    Ezek a függvények itt, hogy beginTransaction, commit stb ezek itt nem pubic, hanem private-ok lesznek 
    És csinálunk egy ilyen változót
    -> 
    private _inTransaction:boolean;
    Ez egy private logikai változó, amely tárolja azt, hogy jelenleg folyamatban van-e egy tranzakció(true) vagy nincs (false)

        constructor() {
        ...
        this._inTransaction = false; ***

        public set inTransaction(inTransaction:boolean) {
            this._inTransaction = inTransaction;
        }
    Ezzel a setter metódus az inTransaction paraméter értékét (true vagy false) fogja hozzárendelni az _inTransaction private 
    tulajdonsághoz, lehetővé téve, hogy a trnazakció állapota a paraméter alapján változzon

    És akkor itt lehetne egy if-vel, hogy tranzalcióban van-e az execute-ban 
    public async execute():Promise<QueryResult|any> {
        try {
            this.conn = await pool.promise().getConnection();
            if() ****
    De ez meg azért nem lesz jó, mert lehet, hogy egymás után több ilyet hajtunk majd végre, tehát ez így biztos, hogy nem lesz jó 

    Azt kell csinálni, hogy a beginTransaction-nél visszaállítjuk mindegyiket PUBLIC-ra
    És ez a inTransaction az kell, de viszont nem kell, hogy ilyen legyen _inTransaction meg nem kell a set-er sem 
    ->
    ..
    private inTransaction:boolean;

    constructor() {
        ...
        this.inTransaction = false;
    }

    És mindegyikben, hogy beginTransaction meg commit, amiket csináltunk függvényekben az inTransaction az true lesz 
    this.inTransaction = true; 
    De előtte megnézzük, hogyha az inTransaction az true, akkor dobunk egy kivételt egy üzenttel 
    ->
    public async beginTransaction() {
        if(this.inTransaction) {  *******
            throw "There is an active transaction under execution!";
        }
        this.inTransaction = true; ******
        await this.conn.beginTransaction();
    }
    Mert ezt a beginTransaction-t nem lehet kétszer elindítani!!! 

    Ez execute-ban meg mielőtt megcsinálnánk a conn-t, csak akkor csinálja meg, hogyha a inTransaction értéke az false (tagadva van)
    public async execute():Promise<QueryResult|any> {
        try {
            if(!this.inTransaction)
                this.conn = await pool.promise().getConnection();

    Azért mert ha nekünk valójában tranzakciókezelésünk van, tehát ha van ez a beginTransaction, akkor nekünk elötte 
    le kell szedni a connection-t!!!!!!
    ->
    public async beginTransaction() {
        if(this.inTransaction) {
            throw "There is an active transaction under execution!";
        }
        this.inTransaction = true;
        this.conn = await pool.promise().getConnection();  *********
        await this.conn.beginTransaction();
    }

    Az execute-ban még egy connection-t nem szedünk le, mert az nem fog emlékezni azokra amit eddig csináltunk 
    Tehát ezt csak, akkor szedjük le ha nincsen connection 
    ->
    public async execute():Promise<QueryResult|any> {
        try {
            if(!this.inTransaction)
                this.conn = await pool.promise().getConnection();

    Ilyenkor már van conection a tranzakciókezelés esetén, mert leszedjük a beginTransaction-ben!! 
    És ilyenkor már tudjuk azt mondani a az insertSomething-ban az index-en, hogy meghívjuk a beginTransaction-t!! 
    -> 
    try {
        await qb.beginTransaction();  **** de itt már van egy connection az volt nekünk a fontos!!! és kell mindegyik elé, hogy await!! 
        const result:QueryResult = await qb.insert("users", user).execute();
        await qb.commit();  ***
        console.log(result);
    } catch(err) {
        await qb.rollBack();  ***
        console.log(err);
    }

    Ugye beginTransaction-nál nem engedjük a többszörös tranzakció elindítást!! 
        if(this.inTransaction) {
            throw "There is an active transaction under execution!";
        }
    Az inTransaction az true lesz 
        this.inTransaction = true;
    Lekérünk egy conn-t 
        this.conn = await pool.promise().getConnection();
    Azt mondjuk, hogy beginTransaction
        await this.conn.beginTransaction();

    Majd meghívjuk a commit()-ot és a rollBack()-et is!! 

    Eexecute-ban meg ha nincs tranzakcióban, akkor kérjük le a connection-t, különben egyébként már kell lennie a beginTransaction() miatt!! 
        if(!this.inTransaction) 
            this.conn = await pool.promise().getConnection();

    A query-vel meg felvisszük az adatokat az adatbázisba, és ott is vannak az adatok ha meghívjuk az insertSomething-ot 
    ->
    async function insertSomething() {
    //példányosítunk, hogy hozzáférjünk a dolgokhoz, amiket csináltunk a SqlQueryBuilder.ts-ben 
    const qb:SqlQueryBuilder = new SqlQueryBuilder();
    const user = {
        isAdmin:0,
        email:'asdf@asdf.hu',
        pass: 'asdf',
        firstName: "János",
        lastName: "Szabo"
    };

    try {
        await qb.beginTransaction();
        const result:QueryResult = await qb.insert("users", user).execute();
        await qb.commit();
        console.log(result);
    } catch(err) {
        await qb.rollBack();
        console.log(err);
    }    

    insertSomething();

    De ha ezt mégegyszer végrehajtanánk, akkor lenne egy hibaüzene, hogy duplicated entry!! 

    Azt nézzük meg, hogy mi van ha egy másik táblába akarunk felvinni valamit ugyanebben az insertSomething-ban 
    ->
    try {
        await qb.beginTransaction();
        const result:QueryResult = await qb.insert("users", user).execute();
        const result2:QueryResult = await qb.insert("ratings", {userID:result.insertId***, rate:5}).execute();  ***
        await qb.commit();
        console.log(result);
    } catch(err) {
        await qb.rollBack();
        console.log(err);
    }
    ***
    Miért fontos, hogy legyen a ratings tábla userID-jához berakjuk az insertId-t, mert ugye az vár egy userID-t meg egy rating-et!! 
    -> 
    Az insertId itt azért fontos, mert megadja a rekord egyedi azonosítóját (ID), amelyet éppen most illesztettünk be a users táblába!! 

    - A második insert utasíásban adatotot szúrunk be a ratings táblába, amely tartalmazza a userID mezőt, ami a users táblában létrehozott 
    felhasználóra vonatkozik 
    - A result[0].insertId segítségével közvetlenül ehhez az új felhasználóhoz kapcsoljuk a minősítést. E nélkül nem tudnánk helyesen 
    társítani az értékelést az éppen létrehozott felhasználóval!! 

    A result[0].insertId: A felhasználó beszúrása után a result[0].insertId megadja az újonnan létrehozott felhasználó ID-jét
    Ezt az ID-t a ratings táblába is továbbadjuk userID-ként a második insert müveletben, biztosítva, hogy az értékelés a megfelelő 
    új felhasználóhoz legyen rendelve!! 

    result-nak a felépítése (egy tömben az első egy objektum a második meg egy tömb a mezőkkel)
    result[0] 
        Ez tartalmazza a beszúrást eredményét beleértve az insertId-t és a többi fent részletezett információt 
            pl. affectedRows, insertId 
    result[1]
        Ez a mezőkhöz kapcsolodó metaadatokat tartalmazza. INSERT müveletnél általában egy üres tömb ([]), mivel nincsenek visszaadott mezők 
        SELECT lekérdezésnél azonban itt láthatnánk az oszlopinformációkat!! 

    Ami fontos!!! 
    Az insertId használatával a szükséges rekord azonosítót kinyerhetjük az INSERT müvelet után és tovább használhatjuk a többi lekérdezéshez!! 
    *****
    És akkor mindegyik táblába a users meg a ratings-be is felment az az adat, amit szerettünk volna!! 

    Az a baj, hogyha van kettő akkor nem tudjuk egymás után emgcsinálni, mert teljesen egybegűzi a dolgokat!! 
    ->
    INSERT INTO users (isAdmin, email, pass, firstName, lastName) 
    VALUES(0, 'szabo.janos@gmail.com', 'asdfasdf', 'János', 'Szabó') INSERT INTO ratings .. tehát így teljesen összefűzi!! 


    Változtatsáok 
    Be kell tenni a rollBack-hez, hogy release(), hogy engedje el a kapcsolatot 
    ->
    public async rollBack() {
        try { await this.conn.rollback(); this.conn.release(); } catch(err) { 
            console.log("SqlQueryBuilder.rollBack", err); 
        }
    }

    Arral van szó, hogy itt kétszer van a végrehajtás, tehát meghívva az execute függvény 
    ->
    try {
        await qb.beginTransaction();
        const result:QueryResult = await qb.insert("users", user).execute();  ****
        const result2:QueryResult = await qb.insert("ratings", {userID:result[0].insertId, rate:5}).execute(); ****

    Ilyenkor nekünk le kell űríteni a query-t meg a values-t miután végrehajtottuk!!! 
    
    létrehozunk a függvényen belül egy sql meg egy values változtót, aminek az értékei this.sql illetve this.values
        public async execute():Promise<QueryResult|any[]> { ***mert ha select van akkor az egy array lesz! 
        try {
            if(!this.inTransaction)
                    this.conn = await pool.promise().getConnection();
            const sql = this.sql;  ***
            const values = this.values;  ***
            this.sql = ""; ***
            this.values = []; ***
            const response:QueryResult = await this.conn.query(sql, values);  ***

    Response-nál meg nem a this.sql-t meg a this.values-t adjuk meg hanem itt a const-ansokat amiket itt létrehoztunk!! 
    és kiürítjük a this.sql-t meg a this.values-t!! 
    tehát így nem marad meg benne az előző lekérdezés vagy felvitelnek az értéke!!! 

    Tehát az elsőnél (result) azt mondjuk, hogy execute az úgy jó, de viszont a másodiknál (result2) azért nem lesz jó, mert az elsőnek az 
    sql query-jét (this.sql) nem töröltük ki  
    ****
    És ami még fontos, hogy az execute-nál nem QueryResult-ot adunk vissza, hanem csak egy ResultSetHeader-t
    public async execute():Promise<QueryResult|any>
    ->
    public async execute():Promise<ResultSetHeader|any>
    mert itt is, akkor any-t kell visszaadni, mert nem lenne különben insertId!!!!!
    const result:any = await qb.insert("users", user).execute();
    const result2:any *** = await qb.insert("ratings", {userID:result.insertId, rate:5}).execute();

    Most felveszünk egy másikat, user-ben átírjuk a email-t, hogy ne legyen duplikáció felvitelnél 
    const user = {
        isAdmin:0,
        email:'asdf2@asdf.hu',***
        pass: 'asdf',
        firstName: "János",
        lastName: "Szabo"
    }     
        const result:any = await qb.insert("users", user).execute();
        const result2:any = await qb.insert("ratings", {userID:654, rate:5}).execute();

    de a másodikban direkt csinálunk egy hibát, hogy a userID-nak nem az insertId-t adjuk meg hanem egy random számot és olyan userID nekünk 
    nincsen a rendszerben!! 

    És akkor nem tud csatlakozni, mert az INNODB (adatbázis beállítás), hogyha van egy idegen kulcsunk, akkor annak ténylegesen kapcsolodnia
    kell egy másik táblához 
    Fontos, hogy a típus amikor elkészítjük a táblákat az INNODB kell, hogy legyen 
    De jelen esetben felvitte, mert nem volt összekapcsolva a két tábla 
    -> 
    alter table ratings foreign key (userID) references users(userID) on delete cascade
    De elötte ki kell törölni azt a rekordot, amit felvitt és nem jó a kulcs!! 

    És így már ha megpróbáljuk végrehajtani, akkor kapunk egy hibaüzenetet és nem lesz semmi a ratings-ben és ami nagyon fontos, hogy nem lesz 
    semmi a users-ben sem 

    De ha viszont visszaírjuk az insertId-t, akkor egyszer végre tudja hajtani, de többször nem mert akkor duplikáció lenne a usersben!! 
    const result2:any *** = await qb.insert("ratings", {userID:result.insertId, rate:5}).execute();

    *****
    index-en megnézzük, hogy hogyan tudunk INSERT után SELECT-elni (getUsers) 



    */
    

    

   
}



export default SqlQueryBuilder;

