//hogy milyen mezők vannak a user-ben az adatbázisban és ezeknek milyen értékei lehetnek 

type User = {
    userID?:number,  
    isAdmin:number,
    email:string,
    pass:string,
    firstName:string,
    lastName:string,
    created:Date,
    updated:Date
};

//ezzel létrehoztunk egy TypeScript típust!!!  

/*
    Kérdőjel azt jelenti, hogy ez null is lehet 

    ? a TypeSCriptben azt jelenti, hogy az adott tulajdonság opcionális vagy nem kötelező megadni 
    Ez nem azt jelenti, hogy az értéke null is lehet, hanem azt, hogy a tulajdonság elhasgyható 

    Ha egy tulajdonság opcionális (userID?:number), az azt jelenti, hogy az értéke lehet 
        - undefined (ha nem adjuk meg)
        - number (ha megadjuk)

    Ha null értéket akarunk megadni, akkor expliciten hozzá kell adni a null típuslehetőséget 
    userID?:number | null 
    Ezzel a userID lehet undefined, number vagy null is 
*/

enum joinTypes {  
    INNER = "INNER JOIN",
    LEFT = "LEFT JOIN", 
    RIGHT = "RIGHT JOIN"
}

/*
    Az enum csak annyit csinál, hogy nem tudjuk elrontani a join-okat, hogy hogyan írjuk 
*/


export {User, joinTypes};
//export-áljuk ezt a típust