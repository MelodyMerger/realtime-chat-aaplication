const mongoose=require("mongoose");

const MessageSchema=new mongoose.Schema({

user:String,
message:String,
file:String,
time:String

});

module.exports=mongoose.model("Message",MessageSchema);