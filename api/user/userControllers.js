const express = require("express");
const appRouter = express.Router();

// route to get user allergies
appRouter.post("/allergies",(req,res)=>{
    console.log("Allergies received : ", req.body);
    res.json({
        status:"success",
        message:"Allergies received",
        received:req.body
    });
});

// route to get user info 
appRouter.post("/register",(req,res)=>{
    console.log("User received from the api : ", req.body);
    res.json({
        status:"success",
        message:"User received",
        received:req.body
    });
});


module.exports = appRouter;