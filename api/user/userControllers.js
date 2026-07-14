const express = require("express");
const appRouter = express.Router();
const pool  = require("../../db.js");
const argon2 = require("argon2");

/*email uniqueness*/
async function emailValidation(email) {
    return (await pool.query("SELECT count(usr_email) from user WHERE usr_email = ?", [email]))[0][0]['count(usr_email)'] > 0 ? false : true;
}

async function hashPassword(password){
    try{
        return await argon2.hash(password);
    }
    catch(err){console.log(err);}
}

/*verify hashed password in db with non-hashed passw*/
async function verifyPassword(hashedPassword, password){
    try{
        if(await argon2.verify(hashedPassword,password)) return true;
        else return false;
    }
    catch(err){console.log(err);}
}

appRouter.post("/register",async (req,res)=>{
    const {username, email,password}= req.body;

    if(!(await emailValidation(email))){
        res.status(401)
        // console.log(res.statusCode);
        return res.json({status: "email_err" , message:"Email is already registered"});
    }
    else{
        await pool.query("INSERT INTO user(usr_username,usr_email,usr_passw) VALUES(?,?,?)",[username,email,await hashPassword(password)]);
    }

    res.json({
        status:"success",
        message:"User received",
        received:req.body
    });
});



appRouter.post("/login",async (req,res)=>{
    const {email,password}=req.body;
    const {usr_passw,usr_role} = (await pool.query("SELECT usr_passw,usr_role FROM user WHERE usr_email=?;",[email]))[0][0];

    if(await verifyPassword(usr_passw,password)){
        if(usr_role === 'admin') 
            res.status(200).json({status:"admin log-in",body: req.body});
        else if(usr_role === 'student')
            res.status(200).json({status:"student log-in",body: req.body});
    }else
        res.status(401).json({status: "unauthorized" ,body: req.body});
});


module.exports = appRouter;