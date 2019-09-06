const MongoClient = require('mongodb').MongoClient;
const url = process.env.MONGO_URI;

module.exports=new Promise((resolve, reject)=>{
    MongoClient.connect(url, { 
        useNewUrlParser: true 
        }, function(err, client) {
        if(err){
            reject(err);
            return;
        }

        console.log("Connected successfully to server");
       
        const db = client.db(process.env.DB_NAME);
        resolve(db);
    
    });
})