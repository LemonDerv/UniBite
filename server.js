const express = require("express");
const app = express();
const cors = require("cors");
const session = require("express-session");

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

// user Routes
const userRoutes = require("./api/user/userControllers");

app.use(cors());

app.use(express.json());

app.use(express.static("public"));

app.use(express.urlencoded({extended: true}));

app.use('/api/user',userRoutes);

app.use("/private", (req,res,next)=>{
    if(req.session && req.session.usr_id)
        next();
    else
        return res.status(401).json({status:"Session-Unauthorized"});
});

app.use('/private',express.static('private'));

app.listen(3000,()=>{
    console.log("Running ");
});

