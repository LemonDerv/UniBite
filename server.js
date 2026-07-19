const express = require("express");
const app = express();
const cors = require("cors");
const session = require("express-session");

app.use(cors());

/* For Post req*/
app.use(express.json());
app.use(express.urlencoded({extended: true}));

/* NO NEED TO '/public' .*/
app.use(express.static("public"));

/* CONFIG FOR SESSION*/ 
app.use(session({
    secret:"keyboard cat",
    resave:false,
    saveUninitialized: true,
    cookie:{
        secure: false,
        httpOnly:true,
        maxAge: 60 * 60 * 24 * 1000
    }
}));

/*USE PUBLIC ROUTER*/ 
const userRoutes = require("./api/user/userControllers");
app.use('/api/user',userRoutes);

/*USE MIDDLEWARE ROUTER*/
const middlewareRouter = require('./api/middleware');
app.use('/private',middlewareRouter);

/* FOR THE AUTH MIDDLEWARE*/
app.use('/private',express.static('private'));

app.listen(3000,()=>{
    console.log("Running ");
});

