const socket = io();

let username = prompt("Enter your name");

socket.emit("join",username);

const messages=document.getElementById("messages");
const input=document.getElementById("msg");
const fileInput=document.getElementById("fileInput");

Notification.requestPermission();

function sendMessage(){

const msg=input.value;

if(msg.trim()==="")return;

socket.emit("message",msg);

input.value="";

}

socket.on("message",(data)=>{

const div=document.createElement("div");

div.className="message";

div.innerHTML=
"<b>"+data.user+"</b>: "+data.message+
"<span class='status'>✓</span>"+
"<button onclick='this.parentElement.remove()'>❌</button>";

messages.appendChild(div);

messages.scrollTop=messages.scrollHeight;

if(Notification.permission==="granted"){
new Notification(data.user,{body:data.message});
}

});

fileInput.addEventListener("change",()=>{

const file=fileInput.files[0];

const reader=new FileReader();

reader.onload=function(){

socket.emit("file",{
name:file.name,
file:reader.result
});

};

reader.readAsDataURL(file);

});

socket.on("file",(data)=>{

const div=document.createElement("div");

div.className="message";

div.innerHTML=
"<b>"+data.user+"</b> sent file <a href='"+data.file+"' download>"+data.name+"</a>";

messages.appendChild(div);

});

let recorder;
let audioChunks=[];

navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{

recorder=new MediaRecorder(stream);

recorder.ondataavailable=e=>{
audioChunks.push(e.data);
};

recorder.onstop=()=>{

const blob=new Blob(audioChunks);

audioChunks=[];

const reader=new FileReader();

reader.onload=()=>{
socket.emit("voice",reader.result);
};

reader.readAsDataURL(blob);

};

});

document.getElementById("recordBtn").onclick=()=>{

recorder.start();

setTimeout(()=>{
recorder.stop();
},3000);

};

socket.on("voice",(data)=>{

const div=document.createElement("div");

div.innerHTML=
"<b>"+data.user+"</b><br>"+
"<audio controls src='"+data.audio+"'></audio>";

messages.appendChild(div);

});

input.addEventListener("keypress",(e)=>{

socket.emit("typing");

if(e.key==="Enter")sendMessage();

});

socket.on("typing",(msg)=>{

document.getElementById("typing").innerText=msg;

setTimeout(()=>{
document.getElementById("typing").innerText="";
},1000);

});

socket.on("users",(users)=>{

const list=document.getElementById("users");

list.innerHTML="";

users.forEach((u)=>{

const li=document.createElement("li");

li.textContent=u;

list.appendChild(li);

});

});

const emojiBtn=document.getElementById("emojiBtn");
const emojiBox=document.getElementById("emojiBox");

emojiBtn.onclick=()=>{

emojiBox.style.display=
emojiBox.style.display==="block"?"none":"block";

};

emojiBox.addEventListener("click",(e)=>{

input.value+=e.target.innerText;

});

document.getElementById("search").addEventListener("input",(e)=>{

const text=e.target.value.toLowerCase();

document.querySelectorAll(".message").forEach(m=>{

m.style.display =
m.innerText.toLowerCase().includes(text)
? "block"
: "none";

});

});