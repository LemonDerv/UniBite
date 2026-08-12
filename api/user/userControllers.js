require('dotenv').config();
const express = require("express");
const appRouter = express.Router();
const pool  = require("../../db.js");
const sdk = require("node-appwrite");
const {InputFile} = require('node-appwrite/file');
const multer =  require('multer');
const storage = multer.memoryStorage();
const upload = multer({storage : storage});

const { verifyPassword,hashPassword} = require("../utilities.js");

const client = new sdk.Client()
    .setEndpoint(process.env.API_ENDPOINT)
    .setProject(process.env.PROJECT_ID)
    .setKey(process.env.API_KEY);

const cloudstorage = new sdk.Storage(client);

appRouter.post("/register",async (req,res)=>{
    const {username, email,password}= req.body;
    const connection = await pool.getConnection();

    try {
        const emailValidation = (await connection.query("SELECT count(usr_email) from user WHERE usr_email = ?", [email]))[0][0]['count(usr_email)'] > 0 ? false : true;

        if(!emailValidation){
            return res.status(409).json({status: "Email-Conflict" , message:"Email is already registered. Redirecting to Login."});
        }
        const hashedPassw = await hashPassword(password);
        await connection.beginTransaction();
        const result = (await connection.query("INSERT INTO user(usr_username,usr_email,usr_passw) VALUES(?,?,?)",[username,email,hashedPassw]))[0];
        await connection.commit();

        if(result.affectedRows === 0){
            return res.status(400).json({status : 'NO-INSERT_USER',message : 'Cant register right now.'});
        }

        const usr_id = result.insertId;
    
        req.session.usr_id = usr_id;
        req.session.username = username;
        req.session.LoggedIn = true;

        req.session.save((err)=>{
            if(err){
                console.log("Error saving session : ", err);
                return res.status(403).json({status:"Session-Forbidden", message:"Error Saving Session"});
            }
            return res.status(201).json({status: "User-Successful_Response", message: "User registered." , username: `${req.session.username}`, usr_id: req.session.usr_id});
        });
    }
    catch(err){
        await connection.rollback();
        console.log(err);
        res.status(500).json({status:"DB/SERVER-Error", message: "Server is not available."});
    }
    finally{await connection.release()}
});

appRouter.post("/login",async (req,res)=>{
    const {email,password}=req.body;

    try{
        const temp= (await pool.query("SELECT usr_id,usr_passw,usr_role,usr_username FROM user WHERE usr_email=?;",[email]))[0];

        const {usr_id,usr_passw,usr_role,usr_username} = temp.length ===0 ? {} : temp[0];

        if(!usr_id)
            return res.status(401).json({status: "Unauthorized" , message:"Incorect Credentials.Try Again"});
        else{
            if(await verifyPassword(usr_passw,password)){
                req.session.usr_id = usr_id;
                req.session.LoggedIn = true;
                req.session.username = usr_username;

                req.session.save((err)=>{
                    if(err){
                        console.log("Error saving session.", err);
                        return res.status(403).json({status:"Session-Forbidden",message:"Error Saving Session."});
                    }

                    if(usr_role === 'admin') 
                        return res.status(200).json({status:"ADMIN-Successful_Response",message:"Admin Logged-In.",username : `${req.session.username}`, usr_id: req.session.usr_id});
                    else if(usr_role === 'student')
                        return res.status(200).json({status:"STUDENT-Successful_Response",message:"Student Logged-In",username : `${req.session.username}`, usr_id: req.session.usr_id});
                });
            }
            else
                return res.status(401).json({status:"Unauthorized" , message:"Incorect Credentials.Try Again."});
        }
    }
    catch(err){
        return res.status(500).json({status:"DB/SERVER-Error", message: "Server is not available.Try Again."});
    }       
});

appRouter.post('/createMeal',upload.single('image') ,async (req,res)=>{
    const {title,description,portions,address,pickupWindows,tags,allergens} = JSON.parse(req.body.mealInfo);
    let lst_id;
    const connection = await pool.getConnection();
    
    try{    
        await connection.beginTransaction();
        const result = (await connection.query("INSERT INTO listing(poster,title,description,portions,pickup_location,pickup_latitude,pickup_longitude) VALUES(?,?,?,?,?,?,?)",[req.session.usr_id,title,description,portions,address.address,address.latlong.lat , address.latlong.lng]))[0];

        if(result.affectedRows === 0){
            return res.status(400).json({status : 'NO-INSERT_LISTING',message : 'Cant create a post right now.'});
        }

        lst_id = result.insertId;

        const pickup_windows_data = pickupWindows.map(window=>{
            return [lst_id,`${window.startDate} ${window.startTime}:00`, `${window.endDate} ${window.endTime}:00`];
        });
        await connection.query("INSERT INTO pickup_window(lst_id,pickup_start,pickup_end) VALUES ?", [pickup_windows_data]);

        if(allergens.length > 0){
            let allerg_data = (await connection.query("SELECT allerg_id FROM allergen WHERE  allerg_type IN (?)",[allergens]))[0];
            allerg_data  = allerg_data.map(allergy=>{
                return [allergy.allerg_id, lst_id];
            });
            await connection.query("INSERT INTO lst_has_allergens(allerg_id,lst_id) VALUES ?" , [allerg_data]);
        }

        if(tags.length > 0){
            let tag_data = (await connection.query("SELECT mtag_id FROM meal_tag WHERE mtag_type IN (?)",[tags]))[0];

            tag_data = tag_data.map(tag=>{
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

appRouter.post('/allergies' , async (req,res)=>{
    const data =req.body;
    const connection = await pool.getConnection();

    try{
        const allerg_id = (await connection.query('SELECT allerg_id FROM allergen WHERE allerg_type IN (?)' , [data]))[0];

        if(!allerg_id.length)
            return res.status(404).json({status:"ALLERGENS-NOT_FOUND", message : "Allergies not found"});

        await connection.beginTransaction();
        await connection.query('INSERT INTO std_allergy(std_id,allerg_id) VALUES ?' , [allerg_id.map(id => [req.session.usr_id , id.allerg_id])]);
        await connection.commit();
        return res.status(200).json({status:"ALLERGENS-FOUND" , message: 'Allergens found.'});
    }
    catch(err){
        await connection.rollback();
        console.log('Server Error : ', err);
        return res.status(500).json({status:"DB/SERVER-ERROR" , message : "Server Error"});
    }
    finally{await connection.release();}
})

appRouter.post('/addresses' , async (req,res)=>{
    const [defaultAddr , ...data] = req.body;
    const connection =await pool.getConnection();
    
    try{
        await connection.beginTransaction();
        await connection.query(
            "INSERT INTO usr_has_addr(std_id, address_text, latitude, longitude, is_default) VALUES (?)",
            [[req.session.usr_id, defaultAddr.display, defaultAddr.lat, defaultAddr.lng, true]]
        );
        if (data.length > 0) {
            const addr = data.map(addr => [req.session.usr_id, addr.display, addr.lat, addr.lng]);
            await connection.query(
                "INSERT INTO usr_has_addr(std_id, address_text, latitude, longitude) VALUES ?",
                [addr]
            );
        }
        await connection.commit();
        return res.status(200).json({status: "ADRESSES-FOUND" , message: "Addresses found"});
    }
    catch(err){
        await connection.rollback();
        console.log('Server Error : ', err);
        return res.status(500).json({status:"DB/SERVER-ERROR" , message : "Server Error"});
    }
    finally{await connection.release();}
})

appRouter.post('/request',async (req,res)=>{
    const data = req.body;
    const connection = await pool.getConnection();
    try{
        await connection.beginTransaction();
        await connection.query("INSERT INTO requests(lst_id, std_id) VALUES (?,?) ",[data.lst_id , req.session.usr_id]);
        await connection.commit();
        return res.status(201).json({status:"REQUEST-CREATED", message:"Request created."});
    }
    catch(err){
        await connection.rollback();
        console.log('Server Error : ', err);
        return res.status(500).json({status:"DB/SERVER-ERROR" , message : "Server Error"});
    }
    finally{await connection.release();}
})

appRouter.post('/updateRequest' , async ( req,res)=>{
    const data = req.body;
    const status = data.action ==='confirm'? 'ACCEPTED' : 'REJECTED';
    const connection = await pool.getConnection();

    try{
        await connection.beginTransaction();
        const [requestInfo] = await connection.query(
            `SELECT lst_id
             FROM requests
             WHERE rq_id = ?`,
            [data.req_id]
        );
        if (!requestInfo.length) {
            await connection.rollback();
            return res.status(404).json({
                status: "REQUEST-NOT-FOUND",
                message: "Request not found."
            });
        }
        const lst_id = requestInfo[0].lst_id;
        await connection.query(
            `UPDATE requests
             SET status = ?,
                 updated_at = CURRENT_TIMESTAMP()
             WHERE rq_id = ?`,
            [status, data.req_id]
        );
        
        if (status === 'ACCEPTED') {
            // get the listing's current number of portions
            const [listing] = await connection.query(
                `SELECT portions
                 FROM listing
                 WHERE lst_id = ?`,
                [lst_id]
            );
            if (listing.length && listing[0].portions === 0) {
                // last portion was accepted -> reject all remaining pending requests
                await connection.query(
                    `UPDATE requests
                     SET status = 'REJECTED',
                         updated_at = CURRENT_TIMESTAMP()
                     WHERE lst_id = ?
                     AND status = 'PENDING'`,
                    [lst_id]
                );
            }
        }
        await connection.commit();
        return res.status(200).json({
            status: "REQUEST-UPDATED",
            message: "Request updated.",
            request_status: status
        });
    }
    catch (err) {
        await connection.rollback();
        console.log('Server Error : ', err);
        return res.status(500).json({
            status: "DB/SERVER-ERROR",
            message: "Server Error"
        });
    }
    finally {
        connection.release();
    }
})

appRouter.post('/updateDelivery' , async ( req,res)=>{
    const data = req.body;
    const del_id = data.del_id;
    const action = data.action;
    const connection = await pool.getConnection();
    
    try{
        await connection.beginTransaction();
        if (action === "DELIVERED") {
            await connection.query(
                `UPDATE deliveries SET status = 'DELIVERED', del_time = CURRENT_TIMESTAMP()
                 WHERE del_id = ?`, [del_id]
            );
        }
        else if (action === "REJECTED") {
            await connection.query(
                `UPDATE deliveries SET status = 'REJECTED'
                 WHERE del_id = ?`, [del_id]
            );
        }
        else {
            await connection.rollback();
            return res.status(400).json({
                status: "INVALID-ACTION",
                message: "Invalid delivery action."
            });
        }

        await connection.commit();
        return res.status(200).json({
            status: "DELIVERY-UPDATED",
            message: "Delivery Updated."
        });
    }
    catch(err){
        await connection.rollback();
        console.log('Server Error : ', err);
        return res.status(500).json({status:"DB/SERVER-ERROR" , message : "Server Error"});
    }
    finally{await connection.release();}
})

appRouter.post('/updateRating' , async(req,res)=>{
    const {rating , del_id} = req.body;
    const connection = await pool.getConnection();

    try{
        await connection.beginTransaction();
        await connection.query("UPDATE deliveries SET rating=? ,rating_timestamp=CURRENT_TIMESTAMP(),status='COMPLETED' WHERE del_id=?" , [rating, del_id]);
        await connection.commit();
        return res.status(200).json({status:"UPDATED-RATING" , message: "Rating passed."});
    }
    catch(err){
        await connection.rollback();
        console.log('Server Error : ', err);
        return res.status(500).json({status:"DB/SERVER-ERROR" , message : "Server Error"});
    }
    finally{await connection.release();}
});

//fetch student details (username, credits, given meals, allergies, addresses)
appRouter.get("/:usr_id", async (req, res) => {
    const {usr_id} = req.params;
    const connection = await pool.getConnection();
    try {
        const [userRows] = await connection.query(
            "SELECT usr_username, credits, given_meals FROM user JOIN student ON user.usr_id = student.std_id WHERE user.usr_id = ?", [usr_id]
        );
        if (!userRows.length) {
            return res.status(404).json({ status: "NOT_FOUND", message: "User not found." });
        }
        const userData = userRows[0];

        const [allergyRows] = await connection.query(
            `SELECT a.allerg_id, a.allerg_type
             FROM allergen a
             JOIN std_allergy sa ON a.allerg_id = sa.allerg_id
             WHERE sa.std_id = ?`,
            [usr_id]
        );
        const allergies = allergyRows.map(row => row.allerg_id);

        const [addressRows] = await connection.query(
            "SELECT addr_id, address_text, latitude, longitude, is_default FROM usr_has_addr WHERE std_id = ?", [usr_id]
        );
        const addresses = addressRows.map(row => ({
            addr_id: row.addr_id,
            text: row.address_text,
            lat: row.latitude,
            lng: row.longitude,
            isDefault: row.is_default
        }));

        res.status(200).json({
            status: "SUCCESS",
            user: {
                username: userData.usr_username,
                credits: userData.credits,
                deliveredMeals: userData.given_meals,
                allergies,
                addresses
            }
        });
    } catch (err) {
        console.log("Error fetching user data:", err);
        res.status(500).json({ status: "DB_ERROR", message: "Failed to fetch user data." });
    } finally {
        await connection.release();
    }
});

//username update
appRouter.patch("/username", async (req, res) => {
    const {username} = req.body;
    const usr_id = req.session.usr_id;
    const connection = await pool.getConnection();
    try {
        await connection.query(
            "UPDATE user SET usr_username = ? WHERE usr_id = ?",
            [username, usr_id]
        );
        res.status(200).json({ status: "SUCCESS", message: "Username updated." });
    } catch (err) {
        console.log("Error updating username:", err);
        res.status(500).json({ status: "DB_ERROR", message: "Failed to update username." });
    } finally {
        await connection.release();
    }
});

//user allergens update
appRouter.patch("/allergies", async (req, res) => {
    const {allergies} = req.body;
    const usr_id = req.session.usr_id;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        //clear existing allergies
        await connection.query("DELETE FROM std_allergy WHERE std_id = ?", [usr_id]);
        //insert new allergies
        if (allergies.length > 0) {
            const allergyData = allergies.map(allerg_id => [usr_id, allerg_id]);
            await connection.query(
                "INSERT INTO std_allergy (std_id, allerg_id) VALUES ?",
                [allergyData]
            );
        }
        await connection.commit();
        res.status(200).json({ status: "SUCCESS", message: "Allergies updated." });
    } catch (err) {
        await connection.rollback();
        console.log("Error updating allergies:", err);
        res.status(500).json({ status: "DB_ERROR", message: "Failed to update allergies." });
    } finally {
        await connection.release();
    }
});

//add an address
appRouter.post("/addresses/single", async (req, res) => {
    const { address, lat, lng, isDefault = false } = req.body;
    const usr_id = req.session.usr_id;
    const connection = await pool.getConnection();
    try {
        await connection.query(
            "INSERT INTO usr_has_addr (std_id, is_default, address_text, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
            [usr_id, isDefault, address, lat, lng]
        );
        res.status(201).json({ status: "SUCCESS", message: "Address added." });
    } catch (err) {
        console.log("Error adding address:", err);
        res.status(500).json({ status: "DB_ERROR", message: "Failed to add address." });
    } finally {
        await connection.release();
    }
});

//remove an address
appRouter.delete("/addresses/:addr_id", async (req, res) => {
    const { addr_id } = req.params;
    const usr_id = req.session.usr_id;
    const connection = await pool.getConnection();

    try {
        //check if this is the only address as to prevent deletion
        const [addressCount] = await connection.query(
            "SELECT COUNT(*) AS count FROM usr_has_addr WHERE std_id = ?",
            [usr_id]
        ); 
        if (addressCount[0].count === 1) {
            return res.status(400).json({
                status: "ERROR",
                message: "Cannot delete the only address. Add another address first."
            });
        }

        //check if this is the default address
        const [isDefault] = await connection.query(
            "SELECT is_default FROM usr_has_addr WHERE addr_id = ? AND std_id = ?",
            [addr_id, usr_id]
        );

        if (isDefault[0]?.is_default) {
            //set another address (the first non-default) as default
            await connection.query(
                `UPDATE usr_has_addr
                 SET is_default = true
                 WHERE std_id = ? AND addr_id != ?
                 LIMIT 1`,
                [usr_id, addr_id]
            );
        }

        //delete the address
        await connection.query(
            "DELETE FROM usr_has_addr WHERE addr_id = ? AND std_id = ?",
            [addr_id, usr_id]
        );

        res.status(200).json({ status: "SUCCESS", message: "Address deleted." });
    } catch (err) {
        console.log("Error deleting address:", err);
        res.status(500).json({ status: "DB_ERROR", message: "Failed to delete address." });
    } finally {
        await connection.release();
    }
});

//set address as default
appRouter.patch("/addresses/:addr_id/set-default", async (req, res) => {
    const { addr_id } = req.params;
    const usr_id = req.session.usr_id;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        //clear previous default for this user
        await connection.query(
            "UPDATE usr_has_addr SET is_default = false WHERE std_id = ?",
            [usr_id]
        );
        //set the selected address as default
        await connection.query(
            "UPDATE usr_has_addr SET is_default = true WHERE addr_id = ? AND std_id = ?",
            [addr_id, usr_id]
        );
        await connection.commit();
        res.status(200).json({ status: "SUCCESS", message: "Default address updated." });
    } catch (err) {
        await connection.rollback();
        console.log("Error setting default address:", err);
        res.status(500).json({ status: "DB_ERROR", message: "Failed to set default address." });
    } finally {
        await connection.release();
    }
});

module.exports = appRouter;