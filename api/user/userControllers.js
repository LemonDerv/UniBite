require('dotenv').config();
const express = require("express");
const appRouter = express.Router();
const pool  = require("../../db.js");
const argon2 = require("argon2");
const sdk = require("node-appwrite");
const {InputFile} = require('node-appwrite/file');
const multer =  require('multer');
const storage = multer.memoryStorage();
const upload = multer({storage : storage});

const client = new sdk.Client()
    .setEndpoint(process.env.API_ENDPOINT)
    .setProject(process.env.PROJECT_ID)
    .setKey(process.env.API_KEY);

const cloudstorage = new sdk.Storage(client);

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
        const [rows] = await pool.query("INSERT INTO user(usr_username,usr_email,usr_passw) VALUES(?,?,?)",[username,email,hashedPassw]);
        const usr_id = rows.insertId;
    
        req.session.usr_id = usr_id;
        req.session.username = username;
        req.session.LoggedIn = true;

        req.session.save((err)=>{
            if(err){
                console.log("Error with sessions : ", err);
                return res.status(403).json({status:"Session-Forbidden", message:"Error Saving Session"});
            }
            res.status(201).json({status: "User-Successful_Response", message: "User registered." , username: `${req.session.username}`});
        });
    }
    catch(err){
        console.log(err);
        res.status(500).json({status:"DB/SERVER-Error", message: "Server is not available."});
    }
});

appRouter.post("/login",async (req,res)=>{
    const {email,password}=req.body;
    try{
        const temp= (await pool.query("SELECT usr_id,usr_passw,usr_role,usr_username FROM user WHERE usr_email=?;",[email]))[0][0];
        const  {usr_id,usr_passw,usr_role,usr_username} = temp === undefined ? {} : temp;

        if(!usr_id)
            res.status(401).json({status: "Unauthorized" , message:"Incorect Credentialss.Try Again"});
        else{
            if(await verifyPassword(usr_passw,password)){
                req.session.usr_id = usr_id;
                req.session.LoggedIn = true;
                req.session.username = usr_username;

                req.session.save((err)=>{
                    if(err){
                        console.log("error with sessions", err);
                        return res.status(403).json({status:"Session-Forbidden",message:"Error Saving Session"});
                    }

                    if(usr_role === 'admin') 
                        res.status(200).json({status:"ADMIN-Successful_Response",message:"Admin Logged-In.",username : `${req.session.username}`});
                    else if(usr_role === 'student')
                        res.status(200).json({status:"STUDENT-Successful_Response",message:"Student Logged-In",username : `${req.session.username}`});
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

appRouter.post('/createMeal',upload.single('image') ,async (req,res)=>{
    const {title,description,portions,address,pickupWindows,tags,allergens} = JSON.parse(req.body.mealInfo);
    let lst_id;
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try{    
        const [rows] = await connection.query("INSERT INTO listing(poster,title,description,portions,pickup_location,pickup_latitude,pickup_longitude) VALUES(?,?,?,?,?,?,?)",[req.session.usr_id,title,description,portions,address.address,address.latlong.lat , address.latlong.lng]);
        lst_id = rows.insertId;

        const pickup_windows_data = pickupWindows.map(window=>{
            return [lst_id,`${window.startDate} ${window.startTime}:00`, `${window.endDate} ${window.endTime}:00`];
        });
        await connection.query("INSERT INTO pickup_window(lst_id,pickup_start,pickup_end) VALUES ?", [pickup_windows_data]);

        if(allergens.length){
            let allerg_data = await connection.query("SELECT allerg_id FROM allergens WHERE  allerg_type IN (?)",[allergens]);
            allerg_data  = allerg_data[0].map(allergy=>{
                return [allergy.allerg_id, lst_id];
            });
            await connection.query("INSERT INTO lst_has_allergens(allerg_id,lst_id) VALUES ?" , [allerg_data]);
        }
        if(tags.length){
            let tag_data = await connection.query("SELECT mtag_id FROM meal_tag WHERE mtag_type IN (?)",[tags]);
            /*INSERT MEAL TAGS FOR THE LISTING*/ 
            tag_data = tag_data[0].map(tag=>{
                return [tag.mtag_id , lst_id];
            });
            await connection.query("INSERT INTO lst_has_meal_tag(mtag_id,lst_id) VALUES ?",[tag_data]);
        }
        await connection.commit();
    }
    catch(err){
        await connection.rollback();
        console.log("Err from db/server: ", err);
        return res.status(500).json({status:'DB/SERVER-ERROR', message:'Cant create Meal right now.'});
    }
    finally{connection.release();}
    
    try{
       if(req.file){
            /* fileId = listing id + image original name*/ 
            const file_id = `${lst_id}_${req.file.originalname}`;
            const image = InputFile.fromBuffer(req.file.buffer , req.file.originalname);
            const response = await cloudstorage.createFile({
                bucketId: process.env.BUCKET_ID,
                fileId: file_id,
                file: image
            });
        }
    }
    catch(err){
        console.log("Err from cloud-storage : " , err);
        return res.status(500).json({status:'CLOUD-STORAGE_ERR', message:'Image didnt saved to Storage.'});
    }
    return res.status(201).json({status:"Meal Created."});
});

module.exports = appRouter;