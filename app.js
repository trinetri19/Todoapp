const express = require('express')
const app = express()
const path = require('path')
const mongoose = require('mongoose')
const port = 8080
const session = require('express-session')
const flash = require('connect-flash')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const User = require('./models/users.js')
const ejsMate = require("ejs-mate")
const Todo = require('./models/todos.js')
const MethodOverride = require('method-override')
const ExpressError =require("./views/utils/ExpressError.js")

main().then(()=>{
        console.log("successful connected")
     }).catch((err)=>{
        console.log(err,"mongoose error")
     })

 async function main(){
 await mongoose.connect("mongodb://127.0.0.1:27017/todoapp")
}

const sessionObject = {
    secret:"jennie",
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires:Date.now() + 7 * 24 * 60 * 60 *1000,
        maxAge:7 * 24 * 60 * 60 * 1000,
        htttpOnly:true 
    }
}

app.use(session(sessionObject))
app.use(flash())

app.use(MethodOverride("_method"))
app.use(express.urlencoded({extended:true}))
app.engine('ejs',ejsMate)
app.use(express.static(path.join(__dirname,"/public")))

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()))

passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.use((req,res,next)=>{
    res.locals.success = req.flash("success")
    res.locals.error = req.flash("error")
    res.locals.currentUser = req.user
    next()
})

app.set("views",path.join(__dirname,"views"))
app.set("view engine","ejs")

const isLoggedIn = (req,res,next)=>{
    if(!req.isAuthenticated()){
        req.session.redirectUrl = req.originalUrl
       req.flash("error","You must be Logged in to make changes in your Item! ")
       return  res.redirect("/login")
    }
    next()
}

app.get("/signup",(req,res)=>{
    res.render("todoapp/signup.ejs")
})

app.get("/login",(req,res)=>{
    res.render("todoapp/login.ejs")
})

app.post("/signup", async (req,res)=>{
    try{
  let {email,username ,password} = req.body
 const newUser = new User({email,username})
 const registerdUser = await  User.register(newUser,password)
 req.login(registerdUser,(err)=>{
    if(err){
        return next(err)
    }
    req.flash("success", `Welcome ${registerdUser.username}`)
    res.redirect("/todo")
 })

    }catch(err){
        req.flash("error", err.message)
       res.redirect("/signup")
    }
})

app.post("/login",(req,res)=>{
    passport.authenticate("local",{
        failureRedirect:"/login",
        failureFlash:true
    })
    req.flash("success","You are Logged in")
    res.redirect("/todo")
})

app.get("/logout",(req,res)=>{
    req.logout((err)=>{
        if((err)=>{
            return next(err)
        })
        req.flash("success","You are Log out!!")
        res.redirect("/todo")
    })
})

app.get("/todo", async (req,res)=>{
    let allTask = await Todo.find({})
res.render("todoapp/home.ejs",{allTask})
})

app.post("/todo/create",isLoggedIn,async (req,res)=>{
    let {task} = req.body
    let addTask = new Todo({task})
    addTask.user = req.user._id
    await  addTask.save()
    res.redirect("/todo")
})

app.delete("/todo/:id",async(req,res)=>{
    let {id} = req.params
    await Todo.findByIdAndDelete(id)
  res.redirect("/todo")
})

app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"PAGE NOT FOUND"));
})

app.use((err,req,res,next)=>{
    let {statusCode = 404 , message = "Oops! Something Went Wrong"} = err
    res.render("todoapp/error.ejs",{message})
}) 

app.listen(port,(req,res)=>{
    console.log("server is listening")
})