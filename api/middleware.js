const express = require("express");
const middlewareRouter = express.Router();

/* SWITCH BETWEEN PUBLIC -> PRIVATE PAGES. EACH ROUTE PASSES THIS MIDDLEWARE. */
middlewareRouter.use("/", (req,res,next)=>{
    if(req.session && req.session.LoggedIn  && req.session.usr_id){
        console.log("passed from the middleware");
        next();
    }
    else{
        console.log("didnt passed from the middleware");
        return res.redirect('/login_register/login.html');
    }
});

module.exports=middlewareRouter;