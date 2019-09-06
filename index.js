require("dotenv").config();
const server = require('http').createServer();
const io = require('socket.io')(server);
var redisClient=require("./utils/redis");
var mongoClient=require("./utils/mongodb");
var request=require("request");
var port = process.env.PORT || 5000;

server.listen(port);

io.use((socket, next)=>{
    const handshakeData=socket.request;
    const uid=handshakeData._query['uid'];

    console.log(uid)

    if(uid){
        redisClient.SADD("hospital_chat_online", uid, (err, reply)=>{
            if(err){
                console.log(err);
                return;
            }
    
            redisClient.SMEMBERS("hospital_chat_online", (err, reply)=>{
                if(err){
                    console.log(err);
                    return;
                }

                console.log(reply);

                request.get(`${process.env.REST_API}/common/type/${uid}`, {json:true},(err, response, body)=>{
                    if(err){
                        console.log(err);
                        return;
                    }

                    mongoClient.then(db=>{
                        const appointmentCollection=db.collection("hospital_appointments");

                        // appointmentCollection.find({hospital_uid}

                        if(response.body.code==="success"){
                            const type=response.body.type;
                            console.log(type);
                            if(type==="hospital"){
                                appointmentCollection.find({hospital_uid:uid}).toArray((err, docs)=>{
                                    if(err){
                                        console.log(err);
                                        return;
                                    }

                                    if(docs){
                                        const userUids=docs.map(a=>a.user_uid);

                                        reply=reply.filter(a=>userUids.includes(a));
                                        io.emit(`online-changed/${uid}`, reply);
                                        console.log("onlines",reply);
                                    }else{
                                        io.emit(`online-changed/${uid}`, []);
                                    }

                                    next();

                                })
                            }else{
                                appointmentCollection.find({user_uid:uid}).toArray((err, docs)=>{
                                    if(err){
                                        console.log(err);
                                        return;
                                    }

                                    if(docs){
                                        const hospitalUids=docs.map(a=>a.hospital_uid);

                                        reply=reply.filter(a=>hospitalUids.includes(a));
                                        io.emit(`online-changed/${uid}`, reply);

                                    }else{
                                        io.emit(`online-changed/${uid}`, []);
                                    }

                                    next();

                                })
                            }
    
                        }

                    }).catch(err=>{
                        console.log(err)
                    })

                })
    
            })
    
            next();
    
        })
    }else{
        next();
    }

})

mongoClient.then(db=>{
    io.on("connection", client=>{
        console.log("connected");
        const handshakeData=client.request;
        const uid=handshakeData._query['uid'];

        client.on("message", data=>{
            const chatCollection=db.collection("hospital_chats");
            data.timestamp=Date.now();
            data.fromId=uid;
            console.log(data)
            chatCollection.insertOne(data, (err, result)=>{
                if(err){
                    console.log(err);
                    return;
                }

                io.emit(`message/${data.toId}`, data);

            })

        })

        client.on("disconnect", ()=>{
            console.log("disconnected")
    
            if(uid){
                redisClient.SREM("hospital_chat_online", uid, (err, reply)=>{
                    if(err){
                        console.log(err);
                    }
        
                    redisClient.SMEMBERS("hospital_chat_online", (err, reply)=>{
                        if(err){
                            console.log(err);
                            return;
                        }
        
                        io.emit("online-changed", reply);
        
                    })
        
                })
            }
    
        })

    })
}).catch(err=>{
    console.log(err);
})