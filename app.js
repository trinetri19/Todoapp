if(process.env.NODE_ENV != "production"){
    require('dotenv').config()
}

const express = require('express')
const app = express()
const path = require('path')
const mongoose = require('mongoose')
const port = 8080
const session = require('express-session')
const MongoStore = require('connect-mongo')
const flash = require('connect-flash')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const User = require('./models/users.js')
const ejsMate = require("ejs-mate")
const Todo = require('./models/todos.js')
const MethodOverride = require('method-override')
const ExpressError = require("./views/utils/ExpressError.js")

const dbUrl=process.env.MONGO_ATLAS;


main().then(() => {
    console.log("successful connected")
}).catch((err) => {
    console.log( "mongoose error",err)
})


async function main() {
    // await mongoose.connect("mongodb://127.0.0.1:27017/todoapp")
     await mongoose.connect(dbUrl)
}


const store = MongoStore.create({
    mongoUrl:dbUrl,
    crypto:{
        secret:process.env.SECRET
    },
    touchAfter:24 * 3600
})
store.on("error",()=>{
    console.log("store error")
})

const sessionObject = {
    store,
    secret:process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}



app.use(MethodOverride("_method"))
app.use(express.urlencoded({ extended: true }))
app.engine('ejs', ejsMate)
app.use(express.static(path.join(__dirname, "/public")))

app.set("views", path.join(__dirname, "views"))
app.set("view engine", "ejs")

app.use(session(sessionObject))
app.use(flash())

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()))

passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.use((req, res, next) => {
    // console.log("Setting res.locals for currentUser");
    res.locals.success = req.flash("success")
    res.locals.error = req.flash("error")
    res.locals.currentUser = req.user
    // console.log(res.locals.currentUser)
    next()
})

app.get("/signup", (req, res) => {
    res.render("todoapp/signup.ejs")
})

app.get("/login", (req, res) => {
    res.render("todoapp/login.ejs")
})

app.post("/signup", async (req, res) => {
    try {
        let { email, username, password } = req.body
        const newUser = new User({ email, username })
        const registerdUser = await User.register(newUser, password)
        req.login(registerdUser, (err) => {
            if (err) {
                return next(err)
            }
            req.flash("success", `Welcome ${registerdUser.username}`)
            res.redirect("/todo")
        })

    } catch (err) {
        req.flash("error", err.message)
        res.redirect("/signup")
    }
})

app.post('/login', passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true
}), (req, res) => {
    req.flash("success", "You are Logged in")
    res.redirect('/todo');
});


app.get("/logout", (req, res) => {
    req.logout((err) => {
        if ((err) => {
            return next(err)
        })
            req.flash("success", "You are Log out!!")
        res.redirect("/todo")
    })
})

app.get("/todo", async (req, res) => {
    let allTask = await Todo.find({}).populate("user")
    res.render("todoapp/home.ejs", { allTask })
})

const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl
        req.flash("error", "You must be Logged in to add Your Task! ")
        return res.redirect("/login")
    }
    next()
}

app.post("/todo/create", isLoggedIn, async (req, res) => {
    let { task } = req.body
    let addTask = new Todo({
        task,
        user: req.user._id
    });
    await addTask.save()
    req.flash("success","Task Added")
    res.redirect("/todo")
})

app.delete("/todo/:id", async (req, res) => {
    let { id } = req.params
    await Todo.findByIdAndDelete(id)
    req.flash("success","Task Completed! Hurray")
    res.redirect("/todo")
})



app.all("*", (req, res, next) => {
    next(new ExpressError(404, "PAGE NOT FOUND"));
})

app.use((err, req, res, next) => {
    let { statusCode = 404, message = "Oops! Something Went Wrong" } = err
    res.render("todoapp/error.ejs", { message })
})

app.listen(port, (req, res) => {
    console.log("server is listening")
})