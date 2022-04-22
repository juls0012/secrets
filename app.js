require('dotenv').config(); //Siempre ponerla al principio en la primera linea y poner el .config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const FacebookStrategy = require("passport-facebook")
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");

// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const app = express();

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
  extended: true
}));

//el codigo siguiente siempre se debe de poner entre estos dos cuando estamos con esta onda de las coockies y usandando passport
app.use(session({
  secret: "Our little secret",
  resave: false,
  saveUninitialized: false,

}));

//este metodo es para empezar usar passport como autenticacion
app.use(passport.initialize());
app.use(passport.session());


//connect db
mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  secret:String,
  googleId: String,
  facebookId: String
});

//lo que hace este es que va a hacerle el hash y salt a las passwords y guardar los usuarios en la base datos
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});

//Es importante declarar el plugin antes del model

const User = new mongoose.model("user", userSchema);

//lineas que nos ayudan a que la app peuda ver y ocualtar las contras
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
//-----this code is for local stategy----
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
  done(null, user.id);
})
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  })
})

//Strategys'

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileUrl: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
      facebookId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));
//get methods

app.get("/", function(req, res) {
  res.render("home");
})

app.get("/login", function(req, res) {
  res.render("login");
})

app.get("/register", function(req, res) {
  res.render("register")
})
app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
})

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile"]
  })); //here i am specifing that we want to get by google (GoogleStrategy), the profile of the user

app.get("/auth/google/secrets",
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });


app.get("/secrets", function(req, res) {
  User.find({"secret":{$ne:null}},function(err,result){
    if(err){
      console.log(err);
    }else{
      if(result){
        res.render("secrets",{secretsArray:result});
      }
    }
  })
})

app.get("/submit",function(req,res){
  //este nos checa si el usuario esta autenticado
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
})

//post methods

app.post("/register", function(req, res) {
  //este metodo proviene del passport local packeage
  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err)
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      })
    }
  })

})

app.post("/login", function(req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  })

  //usamos una function de passport para hacerle login al usuario
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      })

    }
  })
})

app.post("/submit",function(req,res){
  const submitedSecret = req.body.secret;

  User.findById({_id:req.user.id},function(err,result){
    if(err){
      console.log(err);

    }else{
      if(result){
        result.secret = submitedSecret;
        result.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  })
})









app.listen(3000, function() {
  console.log("Server stared on port 3000");
})


// app.post("/register", function(req, res) {
//
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     const newUser = {
//       email: req.body.username,
//       password: hash
//     }
//     User.create(newUser, function(err) {
//       if (!err) {
//         console.log("Succesfully added");
//         res.render("secrets");
//       } else {
//         console.log(err);
//       }
//     })
//   });
//
// })
//
// app.post("/login", function(req, res) {
//   const email = req.body.username;
//   const password = req.body.password;
//
//   User.findOne({email: email}, function(err, resul) {
//     if (resul) {
//       bcrypt.compare(password, resul.password, function(err, result) {
//         if(result){
//           res.render("secrets");
//         }
//       });
//
//
//     } else {
//       console.log("You dont have an account");
//     }
//   })
// })
