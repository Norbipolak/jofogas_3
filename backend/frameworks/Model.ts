/*
    Ez egy specifikus adatbázis táblához fog csatlakozni 

    Ezért lesz egy table változója -> private table:string;

    És a constructor-ban be lehet állítani, hogy melyik táblához csatlakozzon
    pl. jelen esetben azt akarjuk, hogy a users táblához majd
    ->
    constructor(table:string) {
        this.table = table;
    }
*/
import SqlQueryBuilder from "./SqlQueryBuilder.js";

class Model {
    private table:string;
    private qb:SqlQueryBuilder;

    constructor(table:string) {
        this.table = table;
        this.qb = new SqlQueryBuilder();
    }

    public select(fields:string[]):Model{
        this.qb.select(this.table, fields);
        return this;
    }

    public async beginTransaction():Promise<void> {
        await this.qb.beginTransaction();
    }

    public async commit():Promise<void> {
        await this.qb.commit();
    }

    public async rollBack():Promise<void> {
        await this.qb.rollBack();
    }

    public where(field:string, operation:string, value:string):Model {
        this.qb.where(field, operation, value);
        return this;
    }
}

export default Model;

/*
    Két private tulajdonságot definiálunk (table, qb), és egy konstruktort hozunk létre, ami inicializálja ezeket!! 

    table: Ez egy string típusú private tulajdonság, amely a táblanevet tárolja, amelyre a modell vonatkozik 
        Ez lehetővé teszi, hogy a Model osztály bármilyen adatbázistáblát kezeljen a megadott név alapján 
        
    qb: SQL lekérdezések készítésére és végrehajtására használható, így ez a modell a qb tulajdonságok alapján építi fel az sql utasításokat 

    Konstruktor 
    - egy table nevű paramétert vár, ami a modellhez tartozó adatbázistábla nevét jelöli 
    - ezen belül a this.table beállítja a kapott table értékét, ezzel meghatározva, hogy melyik áblára fog vonatkozni a müvelet!!!
    - this.qb segítségével egy új példány jön létre, amellyel késöbb lekérdezéseket lehet végrehajtani!!  

    Használat 
    Ez az osztály pl. lehetővé teszi, hogy különböző modelleket hoz létre, amelyek egy adott táblához kapcsolódnak!! 
    -> 
    const userModel = new Model("users");
    const productModel = new Model("products");

    Itt a userModel a users táblára fog hívatkozni míg a productModel a products táblára.
    Az SqlQueryBuilder segytségével pedig ezek az objektumok különböző lekérdezéseket végezhetnek a megfelelő táblákon!! 

    class Model {
        private table:string;
        private qb:SqlQueryBuilder;

        constructor(table:string) {
            this.table = table;
            this.qb = new SqlQueryBuilder();
        }
    }   

    Az a baj, hogy itt mindent majd újra kell írni, mert ha extend-elünk 
    ->
    class Model extends SqlQueryBuilder{
    mert pl. nekünk itt a select-nél úgy kellene átírni ezt a metódust, hogy nincsen benne a table, mert ez már egy specifikus 
    táblához fog kapcsolodni és nem tudjuk így átírni, csak ha ugyanaz a paraméterlistája!!! 
        és akkor itt nekünk már nem kellene a table!!! 

        public select(table:string, fields:string[]):SqlQueryBuilder {
            this.sql += `SELECT ${fields.join(", ")} FROM ${table}} `;
            return this;
        }

    És akkor itt is lesz egy select, de itt már nem kell nekünk a table!!! 
    public select(fields:string[]):Model{
        this.qb.select(this.table, fields);
        return this;
    }
    fields: string[]
    Ez egy string típusú tömb, amely azokat a mezőneveket tartalmazza, amiket szeretnénk lekérdezni az adatbázisból 
        pl. userID, email stb.. 

    this.qb.select(this.table, fields) 
    Meghívjuk a SqlQueryBuilder select metódusát és átadjuk neki a jelenlegi táblát (this.table) és lekérdezi a kivánt mezőket (fields) 
    Ez a metódus felépíti a SQL SELECT utasítást a megadott mezőkkel és táblanevekkel 

    Visszatérés :Model
    return this;a metódus visszaadja a Model objektumot (saját magát), ami lehetővé teszi a metódusláncolást, így további metódusokat 
    hívhatunk meg ugyanazon az objektumon!!! 

    És akkor ide meg kell hívni egy függvényben amit csináltunk az SqlQueryBuilder-ben 
    ->
    public async beginTransaction():Promise<void> {
        await this.qb.beginTransaction();
    }
    itt ennek a visszatérési értéke egy Promise<void>
    Promise, mert egy async folyamatról van szó!!! 
    void, mert nem adunk issza vele semmit!! 
    Ugyanígy van a commit meg a rollBack is!!! 

    Where-nél meg kell minden paraméter és meghívjuk benne a qb.where-t és átadjuk neki azokat
    és visszaadunk vele egy Model-t!!! (return.this;)
    ->
    public where(field:string, operation:string, value:string):Model {
        this.qb.where(field, operation, value);
        return this;
    }
    

*/