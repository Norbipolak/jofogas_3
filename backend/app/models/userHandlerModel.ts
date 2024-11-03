/*
    Fenntartja az adatbázis kapcsolatot 
*/

import { User } from "./types.js";
/*
    Azért jó, hogy csináltunk egy típust, type-ot a types.js-en, amit ide behívunk
    mert azt tudjuk mondani, hogy amit vár a register user-t az egy User típus lesz!!! 
    ->
    public async register(user:User)***
*/
import { PoolConnection } from "mysql2";
import pool from "../../frameworks/Conn.js";

class userHandlerModel {
    //kell ennek egy connection!!! 
    private conn: PoolConnection | any;

    constructor() {
        /*
            De viszont itt az a probléma, hogyha poolConnection-t akarunk szerezni, ahhoz kell egy async function 
            this.conn = pool.getConnection(); mert ebben az esetben itt kellene nekünk egy callback -> getConnection(()=> {})
                és akkor itt belül kapnánk meg a connection-t {itt} 
            A másik megoldás meg ahogy csináltuk 
            this.conn = await pool.promise().getConnection();
                csak itt meg az a probléma, hogy await-elni kell majd!! 
                de viszont a constructor az nem lehet async, tehát ez így nem lehet -> async constructor() {

            Ezért kell csinálni egy private async getConn()-t 
        */
        //ha megszereztük a connection-t a getConn-val, akkor azt itt meghívjuk és meg lesz a connection 
        this.getConn();
    }

    private async getConn() {
        //kell egy try-catch blokk, hogy elkapja ha van valami hiba 
        try {
            this.conn = await pool.promise().getConnection();
        } catch (err) {
            console.log(err);
        }
    }

    public async register(user: User) {
        /*
            és akkor a user-nek van automtikusan ilyenjei, hogy created, email, firstName...!!! 
        */
        /*
            hash-elés megoldása
            trim-elés megoldása (hogy lehesessen automatikusan trim-elni) 
        */
        try {
            const response:Query = await this.conn.query(
                //beállítottuk az adatbázisban, hogy a users táblán az isAdmin az alapból 0 legyen, ezért ezt nem kell beállítani 
                `INSERT INTO users (email, pass)`,
                [user.email, user.pass] //ami majd itt bejön -> register(user: User)
            );

            if(response[0].affectedRows === 1) {

            } else {

            }

       } catch (err: any) {

        }
    }

    public async login() {

    }

    //hogyan tudunk kétfaktoros autentikációt csinálni 
    public async twoFactor() {

    }
}

export default userHandlerModel;