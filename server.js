const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname,"../client")));

app.get("/",(req,res)=>{
res.sendFile(path.join(__dirname,"../client/chat.html"));
});

let users={};

io.on("connection",(socket)=>{

console.log("User connected");

socket.on("join",(username)=>{
users[socket.id]=username;
io.emit("users",Object.values(users));
});

socket.on("sendMessage",(msg)=>{

const message={
user:users[socket.id],
text:msg,
time:new Date().toLocaleTimeString()
};

io.emit("message",message);

});

socket.on("disconnect",()=>{
delete users[socket.id];
io.emit("users",Object.values(users));
});

});

server.listen(2000,()=>{
console.log("Server running http://localhost:2000");
});