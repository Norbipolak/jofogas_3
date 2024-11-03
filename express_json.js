/*
    Az express.json() egy köztes szoftver (middleware) az Express keretrendszer része, és arra szolgál, hogy a sterver képes legyen 
    JSON formátumú adatokat fogadni és feldolgozni a beérkező HTTP kérések törszében (body).
    
    Amiker egy kliens JSON formátumú adatot küld (pl. egy POST kérés során), az express.json() segítségével az Express szerver automatikusan 
    feldolgozza ezt az adatot. 
    Ez azt jelenti, hogy a JSON adatokat a JavaScript objektumokké alakítja át, így könnyeben használhatók 
*/

//pl. ha a kliens ilyen adatokat küld (JSON) 
{
    "name": "John Doe", 
    "age": 30
}

//az Express.json()-val ezeket az adatokat elérhetjük a body-ban (req.body) objektumban így
app.post("example", (req, res)=> {
    console.log(req.body.name); //John Doe
    console.log(req.body.age);  //30
    res.send("Adatok feldolgozva");
});

/*
    Az express.json() használata különösen akkor fontos, ha modern webalkalmazásokhoz REST API-kat vagy hasonló adatfeldolgozási 
    müveleteket készítünk, ahol gyakran szükség van JSON típusú adatok küldésére és fogadására. Enélkül az express nem ismeri fel a 
    JSON adaokat, és nem tudná őket feldolgozni!! 
*/