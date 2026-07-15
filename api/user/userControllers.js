const express = require("express");
const appRouter = express.Router();
const pool  = require("../../db.js");
const argon2 = require("argon2");

async function hashPassword(password){
    return await argon2.hash(password);
}

/*verify hashed password in db with non-hashed passw*/
async function verifyPassword(hashedPassword, password){
    try{
        if(await argon2.verify(hashedPassword,password)) return true;
        else return false;
    }
    catch(err){
        console.log(err);
        return false;
    }
}

appRouter.post("/register",async (req,res)=>{
    const {username, email,password}= req.body;

    try {
        const emailValidation = (await pool.query("SELECT count(usr_email) from user WHERE usr_email = ?", [email]))[0][0]['count(usr_email)'] > 0 ? false : true;

        if(!emailValidation){
            return res.status(409).json({status: "Email-Conflict" , message:"Email is already registered.Redirecting to Login."});
        }
        const hashedPassw = await hashPassword(password);
        await pool.query("INSERT INTO user(usr_username,usr_email,usr_passw) VALUES(?,?,?)",[username,email,hashedPassw]);
        res.status(201).json({status:"User-Successful_Response", message: "User registered."});
    }
    catch(err){
        console.log(err);
        res.status(500).json({status:"DB/SERVER-Error", message: "Server is not available."});
    }
});

appRouter.post("/login",async (req,res)=>{
    const {email,password}=req.body;
    try{
        const temp= (await pool.query("SELECT usr_id,usr_passw,usr_role FROM user WHERE usr_email=?;",[email]))[0][0];
        const  {usr_id,usr_passw,usr_role} = temp === undefined ? {} : temp;

        if(!usr_id)
            res.status(401).json({status: "Unauthorized" , message:"Incorect Credentialss.Try Again"});
        else{
            if(await verifyPassword(usr_passw,password)){
                req.session.usr_id = usr_id;
                req.session.LoggedIn = true;

                req.session.save((err)=>{
                    if(err){
                        console.log("error with sessions", err);
                        return res.status(403).json({status:"Session-Forbidden",message:"Error Saving Session"});
                    }

                    if(usr_role === 'admin') 
                        res.status(200).json({status:"ADMIN-Successful_Response",message:"Admin Logged-In."});
                    else if(usr_role === 'student')
                        res.status(200).json({status:"STUDENT-Successful_Response",message:"Student Logged-In"});
                });
            }
            else
                res.status(401).json({status:"Unauthorized" , message:"Incorect Credentialss.Try Again."});
        }
    }
    catch(err){
        res.status(500).json({status:"DB/SERVER-Error", message: "Server is not available.Try Again."});
    }       
});


module.exports = appRouter;