import pool from "./frameworks/Conn.js";
import http from "./frameworks/HTTP.js";
async function getSomething() {
    /*
        Ha a limit szerint még van szabad connection, akkor abból kiveszük egyet
        és felhasználjuk!!
        Ha nincsen, akkor addig várunk a beállításunk szerint, ameddig nem lesz
        Ez volt a -> waitForConnections: true
            Tehát nem dobja el a kérést, hanem addig vár, ameddig nem lesz szabad
    */
    const conn = await pool.promise().getConnection();
    const response = await conn.query("SELECT * FROM users");
    console.log(response);
}

getSomething();

/*
    Tranzakciókezelés 
    Az a lényege, hogy lefuttatunk több kérést és, hogyha bármelyikben hiba keletkezik,
    akkor az összeset visszavonjuk!!!! 

    A webshop-os példában volt egy olyan, hogy volt egy orders tábla, ahol bedobjuk az orders-t (orderID, userID, addressID ..) 
    és utána pedig az order_details (tehát itt két insert volt egymás után) order_details (detailID, orderID, productID, quantity)

    Itt 2 probléma merülhet fel 
    1. az orders-nél van valami hiba és nem rakja fel a rekord-ot, amit fel szerettünk volna vinni és utána pedig próbálja az order_details-t
    2. berakja az orders-t (sikerült felvinni) de az order_details-t pedig nem 
    ->
    És hogyha báermelyikben hiba történik, akkor mindegyiket vissza kellene vonni és nem kéne a másikat megcsinálni,
        mert akkor ilyen csonka adatok maradnak az adabázisban!!! 

    Ehhez be kell, hogy hívva legyenek ezek 
    -> 
    import pool from "./frameworks/Conn.js";
    import http from "./frameworks/HTTP.js";

    És ezt le kell majd fordítani -> tsc index.ts --watch --ES2022
    de fontos, hogy jó helyen legyünk, tehát be kell menni abba a könyvtárba, ahol van ez az index file!!!! 
        Itt a backend-be!! cd backend

    1. A legelső dolog az, hogy megszerezzük a connection-t az adatbázishoz 
    ->
    async function insertSomething() {
    try {
        const conn = await pool.promise().getConnection();  ***

    2. ezután jöhet az adatbázisos lekérdezés vagy felvitel (itt majd kettő ilyen lesz) 
    try {
        const conn = await pool.promise().getConnection();
        const response1 = await conn.query(   *****
            `INSERT INTO users (email, pass)
            VALUES(?,?)`,
            ["a", "b"]  -> itt mindegy, hogy mit viszünk fel az adatbázisba, mert ez csak egy teszt 
        )
    
    Itt a jofogas_clone adatbázisban users mellett van egy olyan táblánk is, hogy ratings, ez lesz a 2. felvitel 
    
    És úgy visszük fel a másodikat, hogy az elsőnél visszaadunk egy olyat, hogy insertID (userID), amit ugye visszakapunk minden ilyen lekérdezés 
    vagy felvitel során 
    -> 
        try {
        const conn = await pool.promise().getConnection();
        const response1 = await conn.query(
            `INSERT INTO users (email, pass)
            VALUES(?,?)`,
            ["a", "b"]
        )

        const userID = response1[0].insertId;   ****

    Ami még fontos, hogy a respose1 az visszaadja nekünk az adatokat, amiket felvittünk és ott lesz egy olyan is, hogy affectedRows illetve 
    egy olyan is, hogy insertId, majd visszadja nekünk a mezőket, típusait (tábla mezeit, fields pl. userID int auto_increment primary_key)
    ****
    Mi az a tuple
        Tömbszerűség, de meg van határozva, hogy az egyes tömbelemek, azok pontosan milyen típusuak
    példa 
    let ourTuple: [number, boolean, string]; 
        biztos, hogy ennek a tömbnek 3 eleműnek kell lennie, number, boolean, string, ilyen sorrendben
    ourTuple = [5,false, "something"]
    ****
    És ez nekünk (response1) az egy Promise<[QueryResult, Fieldpacket]>-et ad vissza 
    -> 
    const [result, field] = await conn.query(
        `INSERT INTO users (email, pass)
        VALUES(?,?)`,
        ["a", "b"]
    Ami nekünk fontos az itt a result, mert ott van a insertId

    Megcsináljuk a második felvitelt (a rating-be)!!! ahol van egy rateID (amit automatikusan megad), userID, rate
    ->
        const conn = await pool.promise().getConnection();
        const [result, field] = await conn.query(
            `INSERT INTO users (email, pass)
            VALUES(?,?)`,
            ["a", "b"]
        )

        const userID:number = result[0].insertId;

        const response2 = await pool.query(
            `INSERT INTO ratings (userID, rate)
            VALUES(?,?)`,
            [userID, 5]
        )

    Itt az történik, hogy felviszünk két adatot egymás után, egy felhasználót (user) és a hozzá kapcsoló rating-et 

    Addig, ameddig nincsen semmi probléma, addig mindegyik lefut 
    De ha viszont keletkezik egy hiba (rating-nél), akkor felvisszünk a user-t, de a hozzá tartozó rating-et már nem 
    (Most attól eltekintünk, hogy ez a két tábla nem függ teljesen össze, tehát ha nincsen rating, akkor nem müködik a rendszer) 
        Tehát most úgy gondolkodunk, hogy minden egyes user-nek kell, hogy legyen egy rating-je, vagy különben nem müködik a rendszer 

    Tehát ha a user-nél van a hiba, akkor az nem probléma, mert rögtön bemegyünk a catch ágba és nem visz fel semmit 
    De ha viszont a ratings-be van a hiba, akkor felviszi a user-t (csinálunk itt most egy hibát, egyel több ?)
    -> 
        const response2 = await pool.query(
            `INSERT INTO ratings (userID, rate)
            VALUES(?,?,?)`, ***
            [userID, 5]     ***

    Tehát egyel kevesebb paramétert adtunk meg mint kérdőjelet, ezért itt biztos, hogy megállunk ennél a response2-nél 
        és így felviszi a user-t, de a hozzá tartazó rating-et már nem és ez hiba nálunk!!!
     
    Megnézzük, hogy mi fog történni, ehhez meg kell hívni a függvényt -> insertSomething();
    és nodemon index a terminálba
    Felvitte a users-be az adatokat, hogy "a" és "b" de viszont a ratings-be semmit nem vitt fel!!! 
    ******
    Tehát ha számunkra hibát jelent, akkor mindkettőt vissza kellene vonni 
    Ilyenek lesznek ->
    1. conn.beginTransaction(); ezzel elkezdjük a tranzakciókezelést!! ezt ott kell meghívni mielött lenne a felvitel vagy a lekérdezés 
    -> 
    try {
        const conn = await pool.promise().getConnection();
        conn.beginTransaction();            ***********************
        const results:any = await conn.query(
            `INSERT INTO users (email, pass)
            VALUES(?,?)`,
            ["a", "b"]
        )
    
    2. Ha pedig mindkettő query-t meghívtuk, tehát végbement a felvitel, akkor conn.commit();
    -> 
        conn.beginTransaction();            ***********************
        const results:any = await conn.query(
            `INSERT INTO users (email, pass)
            VALUES(?,?)`,
            ["a", "b"]
        )

        const userID:number = results[0].insertId;

        const response2 = await pool.query(
            `INSERT INTO ratings (userID, rate)
            VALUES(?,?)`,
            [userID, 5]
        )

        conn.commit();      *****************
    
    ****
    Ha pedig nem sikerül valami és bemegyünk a catch ágba és onnan meghívunk a conn.-ból, de nagyon fontos, hogy a const conn az ne 
    a try blokkban legyen, ahol eddig volt, hanem ki kell vinni és ott definiálni, hogy meghívhasunk valamit belőle a catch ágba!!! 
        (el tudjuk érni ott is) 
    ->
    async function insertSomething() {
    let conn;   **** definiáljuk 

    try {
        conn = await pool.promise().getConnection();*** értéket adunk neki itt, fontos, hogy let legyen és ne const 
    *****
    3. rollback()-vel vonjuk vissza a módosításokat, ami a beginTransaction és a commit között történt 

    } catch(err) {
        console.log(err);
        conn.rollback();

    Ami nagyon fontos, hogy ha nincsen a beginTransaction(), commit() vagy a rollback() elött, hogy await és egyszerre több kérés érkezik be 
    akkor lefagy a rendszer 
    És mivel ezt egy promise()-ból szedtük ki, tehát innen vannak meghívva, hogy conn.commit() stb.
     -> conn = await pool.promise().getConnection();
    Tehát mindig await -> await conn.beginTransaction(), await conn.commit(), await conn.rollback() !!!! 

    És ha nem menne a rallback() azt is be kell dobni egy try-catch-be, mert a catch ágban,
    mert ha nincsen berakva a rollback() a try-catch-be és mivel maga a rollback a catch ágban van meghívva és dog valami hibát, akkor 
    azt nincs ami elkapja és megállítja a kód futását!!! 
    ->
        } catch(err) {
        try {
            await conn.rollback();
        } catch(err) {
            console.log(err)
        };
    }

    És akkor így nem rak be semmelyik táblába se semmit bármelyik felvitelben történt a hiba!! 

    Tehát így ugyanúgy megkapjuk a hiaüzenetet, hogy You have an error in you SQL syntax, de viszont nem viszünk fel semmit 
    és így nem is leszek ilyen csonka adataink!! 
        Ez a lényege az egésznek, hogy ne legyenek csonka adatok, amik nem kapcsolodnak sehova sem!!! 

    Csinálunk egy SqlQueryBuilder-t a framework-be!!!

    De nagyon fontos, hogy van egy olyan release, az azt jelenti, hogy ezzel el tudjuk engedni a connection-t 
    és fel tudja használni valami más!! -> await conn.release();
*/
async function insertSomething() {
    let conn;

    try {
        conn = await pool.promise().getConnection();
        await conn.beginTransaction();//elkezdjük a tranzakciókezelést
        const results:any = await conn.query(
            `INSERT INTO users (email, pass)
            VALUES(?,?)`,
            ["a", "b"]
        )

        const userID:number = results[0].insertId;

        const response2 = await pool.query(
            `INSERT INTO ratings (userID, rate)
            VALUES(?,?)`,
            [userID, 5]
        )
        await conn.release();
        await conn.commit();//megpróbáljuk végrehajtani a változtatásokat
    } catch(err) {
        console.log(err);
        //a módosítások visszavonása, ami a beginTransaction és a commit között történt 
        try {
            await conn.rollback();
        } catch(err) {console.log(err)};
    }
}

insertSomething();
