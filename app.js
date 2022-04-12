require('dotenv').config(); //Siempre ponerla al principio en la primera linea y poner el .config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const app = express();


//connect db
mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
  email:String,
  password: String
});


userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});

//Es importante declarar el plugin antes del model

const User = new mongoose.model("user",userSchema);

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended:true}));

app.get("/",function(req,res){
  res.render("home");
})

app.get("/login",function(req,res){
  res.render("login");
})

app.get("/register",function(req,res){
  res.render("register")
})

app.post("/register",function(req,res){
  const email = req.body.username;
  const password = req.body.password;

  const newUser = {
    email : email,
    password: password
  }
  User.create(newUser,function(err){
    if(!err){
      console.log("Succesfully added");
      res.render("secrets");
    }else{
      console.log(err);
    }
  })

})

app.post("/login", function(req,res){
  const email = req.body.username;
  const password = req.body.password;

  User.findOne({email:email},function(err,resul){
    if(resul){
      if(resul.password=== password){
        res.render("secrets");
      }
    }else{
      console.log("You dont have an account");
    }
  })
})

app.get("/logout",function(req,res){
  res.redirect("/");
})










app.listen(3000,function(){
  console.log("Server stared on port 3000");
})
