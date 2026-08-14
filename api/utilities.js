require('dotenv').config();
const { request } = require('express');
const argon2 = require("argon2");
const pool  = require("../db.js");
const sdk = require("node-appwrite");
const {InputFile} = require('node-appwrite/file');
const client = new sdk.Client()
    .setEndpoint(process.env.API_ENDPOINT)
    .setProject(process.env.PROJECT_ID)
    .setKey(process.env.API_KEY);

const cloudstorage = new sdk.Storage(client);

async function getExpiredMeals(usr_id){
    try{
        const expiredMeals = (await pool.query("SELECT * FROM expiredMeals where  poster=?" , usr_id))[0];

        if(expiredMeals.length === 0)
            return {success_status : false , 
                    status:"EXPIRED-MEALS-NOT_FOUND" , 
                    message : 'No expired Meals found.' , 
                    status_code :404 , 
                    body : {}
                };
        else return {success_status : true ,
                     status:"EXPIRED-MEALS-FOUND" , 
                     message : 'Expired Meals found.' , 
                     status_code:200 ,
                     body : expiredMeals
                };
    }
    catch(err){
        console.log("Error with server : ",err);
        return {success_status : false ,
                status: "DB/SERVER-ERROR" ,
                message : "Server error.",
                status_code : 500,
                body: {}
            };
    }
}

async function getActiveMeals(usr_id){
    try{
        const activeMeals = (await pool.query("SELECT * FROM activeMeals WHERE poster=?",[usr_id]))[0];

        if(!activeMeals.length)
            return {success_status : false , 
                    status:"ACTIVE_MEALS-NOT_FOUND" , 
                    message : 'No active Meals found.' , 
                    status_code :404 , 
                    body : {}
                };
        else return {success_status : true ,
                     status:"ACTIVE_MEALS-FOUND" , 
                     message : 'Active Meals found.' , 
                     status_code:200 ,
                     body : activeMeals
                };
    }
    catch(err){
        console.log("Error with server : ",err);
        return {success_status : false ,
                status: "DB/SERVER-ERROR" ,
                message : "Server error.",
                status_code : 500,
                body: {}
            };
    }
}

async function getAllActiveMeals(logged_in_usr){
    try{
        const filterUsr = logged_in_usr ? [logged_in_usr] : [0];
        const activeMeals = (await pool.query("SELECT * FROM activeMeals JOIN user ON poster=usr_id WHERE poster NOT IN (?) ",[filterUsr]))[0];

        if(!activeMeals.length)
            return {success_status : false , 
                    status:"ACTIVE_MEALS-NOT_FOUND" , 
                    message : 'No active Meals found.' , 
                    status_code :404 , 
                    body : {}
                };
        return {success_status : true ,
                     status:"ACTIVE_MEALS-FOUND" , 
                     message : 'Active Meals found.' , 
                     status_code:200 ,
                     body : activeMeals
                };
    }
    catch(err){
        console.log("Error with server : ",err);
        return {success_status : false ,
                status: "DB/SERVER-ERROR" ,
                message : "Server error.",
                status_code : 500,
                body: {}
            };
    }
}

async function getPickupWindows(listings){
    try{
        const pickup_windows = (await pool.query('SELECT lst_id,pickup_start,pickup_end from pickupWindows WHERE lst_id IN (?)',[listings]))[0].reduce((acc,curr)=>{
            if(!acc[curr.lst_id]) acc[curr.lst_id] = [];
            acc[curr.lst_id].push([curr.pickup_start,curr.pickup_end]);
            return acc;
        },{});

        return {success_status : true ,
                     status:"PICKUP_WINDOWS-FOUND" , 
                     message : 'Pickup Windows found.' , 
                     status_code:200 ,
                     body : pickup_windows
            };
    }
    catch(err){
        console.log("Error with server : ",err);
        return {success_status : false ,
                status: "DB/SERVER-ERROR" ,
                message : "Server error.",
                status_code : 500,
                body: {}
            };
    }
}

async function getMealTags(listings){
    try{
        let tags = (await pool.query('SELECT * FROM tags WHERE lst_id IN (?)',[listings]))[0];
        if(!tags.length)
            return {success_status : false ,
                     status:"MEAL_TAGS-NOT_FOUND" , 
                     message : 'Meal tags not found.' , 
                     status_code: 404 ,
                     body : {}
                };

        tags = tags.reduce((acc,curr)=>{
                if(!acc[curr.lst_id]) acc[curr.lst_id] =[];
                acc[curr.lst_id].push(curr.mtag_type);
                return acc;
            },{});

        return {success_status : true ,
                     status:"MEAL_TAGS-FOUND" , 
                     message : 'Meal tags found.' , 
                     status_code:200 ,
                     body : tags
            };
    }
    catch(err){
        console.log("Error with server : ",err);
        return {success_status : false ,
                status: "DB/SERVER-ERROR" ,
                message : "Server error.",
                status_code : 500,
                body: {}
            };
    }
}

async function getAllergens(listings){
    try{
        let allergens = (await pool.query('SELECT allerg_type,lst_id FROM allergens WHERE lst_id in (?)',[listings]))[0];
    
        if(!allergens.length)
            return {success_status : false ,
                     status:"ALLERGENS-NOT_FOUND" , 
                     message : 'Allergens not found.' , 
                     status_code: 404 ,
                     body : {}
                };

        allergens= allergens.reduce((acc,curr)=>{
            if(!acc[curr.lst_id]) acc[curr.lst_id] = [];
            acc[curr.lst_id].push(curr.allerg_type);
            return acc;
        },{});

        return {success_status : true ,
                     status:"ALLERGENS-FOUND" , 
                     message : 'Allergens found.' , 
                     status_code:200 ,
                     body : allergens
            };
    }
    catch(err){
        console.log("Error with server : ",err);
        return {success_status : false ,
                status: "DB/SERVER-ERROR" ,
                message : "Server error.",
                status_code : 500,
                body: {}
            };
    }
}

async function searchListingsImages(listings){
    try{
        let images =await cloudstorage.listFiles(process.env.BUCKET_ID);
        
        if(!images.files.length)
            return {success_status : false ,
                     status:"IMAGES-NOT_FOUND" , 
                     message : 'Images not found.' , 
                     status_code: 404 ,
                     body : {}
                };

        const fileIdRegex = new RegExp(`^(${listings.join('|')})_.*`);
        images = images.files.filter((img)=> fileIdRegex.test(img.$id));
        if(!images.length)
            return {success_status : false ,
                     status:"IMAGES-NOT_FOUND" , 
                     message : 'Images(for the specified listings) not found.' , 
                     status_code: 404 ,
                     body : {}
                };

        images = images.reduce((acc,curr)=>{
            const meal = curr.$id.split('_')[0];
            acc[meal] = `${process.env.API_ENDPOINT}/storage/buckets/${process.env.BUCKET_ID}/files/${curr.$id}/view?project=${process.env.PROJECT_ID}`;
            return acc;
        },{});

        return {success_status : true ,
                     status:"IMAGES-FOUND" , 
                     message : 'Images found.' , 
                     status_code: 200 ,
                     body : images
                };
    }
    catch(err){
        console.log('Image Error: ' ,err);
        return {success_status : false ,
                status: "CLOUD-STORAGE_ERR" ,
                message : "Cant access the image right now.",
                status_code : 500,
                body: {}
            };
    }
}

async function getRequestsPerListing(listings){
    try{
        let req_count = (await pool.query("SELECT * from countRequests where lst_id in(?) " , [listings]))[0];
        if(!req_count.length)
            return {success_status : false ,
                     status:"REQ_COUNT-NOT_FOUND" , 
                     message : 'No requests found.' , 
                     status_code: 404 ,
                     body : {}
                };

        req_count = req_count.reduce((acc,curr)=>{
            acc[curr.lst_id] = curr['count(rq_id)'];
            return acc;
        },{});

        return {success_status : true ,
                status:"REQ_COUNT-FOUND" , 
                message : 'Requests found.' , 
                status_code:200 ,
                body : req_count
            };
    }
    catch(err){
        console.log("Error with server : ",err);
        return {success_status : false ,
                status: "DB/SERVER-ERROR" ,
                message : "Server error.",
                status_code : 500,
                body: {}
            };
    }
}

async function getRequestsInfoPerListing(listings){
    try{
        let req_info=(await pool.query("SELECT * FROM mealRequests WHERE lst_id IN(?) AND status = 'PENDING'",[listings]))[0]
        
        if(!req_info.length)
            return {success_status : false ,
                     status:"REQ-NOT_FOUND" , 
                     message : 'No requests found.' , 
                     status_code: 404 ,
                     body : {}
                };

        req_info = req_info.reduce((acc,curr)=>{
            if(!acc[curr.lst_id]) acc[curr.lst_id] =[];
            acc[curr.lst_id].push({
                rq_id: curr.rq_id,
                username: curr.usr_username,
                created_at: curr.created_at
            });
            return acc;
        },{});

        return {success_status : true ,
                status:"REQ_COUNT-FOUND" , 
                message : 'Requests found.' , 
                status_code:200 ,
                body : req_info
            };
    }
    catch(err){
        console.log("Error with server : ",err);
        return {success_status : false ,
                status: "DB/SERVER-ERROR" ,
                message : "Server error.",
                status_code : 500,
                body: {}
            };
    }
}

async function getRequestPerUsr(usr_id){
    try{
        let requests = (await pool.query("SELECT lst_id,status,created_at FROM userRequests WHERE std_id=?" , [usr_id]))[0];
        if(!requests.length)
            return {success_status : false ,
                     status:"REQUEST-NOT_FOUND" , 
                     message : 'No requests found.' , 
                     status_code: 404 ,
                     body : {}
                };

        return {success_status : true ,
                status:"REQUESTS-FOUND" , 
                message : 'Requests found.' , 
                status_code:200 ,
                body : requests
            };
    }
    catch(err){
        console.log("Error with server : ",err);
        return {success_status : false ,
                status: "DB/SERVER-ERROR" ,
                message : "Server error.",
                status_code : 500,
                body: {}
            };
    }
}

async function updatePostImg(lst_id,img,filename,buffer){   
    try{
        let images =await  cloudstorage.listFiles(process.env.BUCKET_ID);
        if(!images.files.length)
            return {success_status : false ,
                     status:"IMAGES-NOT_FOUND" , 
                     message : 'Images not found.' , 
                     status_code: 404 ,
                };

        const fileIdRegex =new RegExp(`^${lst_id}_.*`);
        images = images.files.filter((img)=> fileIdRegex.test(img.$id));

        if(images.length > 0){
            await cloudstorage.deleteFile(process.env.BUCKET_ID, images[0].$id);    
        }

        const newImageId = `${lst_id}_${filename}`;
        const file = img;
        const inputFile = InputFile.fromBuffer(buffer, filename);
        await  cloudstorage.createFile(process.env.BUCKET_ID, newImageId , inputFile);
        return {success_status : true ,
                status: "IMG-UPDATED" ,
                message : "Image updated.",
                status_code : 201,
            };
    }
    catch(err){
        console.log('Image Error: ' ,err);
        return {success_status : false ,
                status: "CLOUD-STORAGE_ERR" ,
                message : "Cant access the image right now.",
                status_code : 500,
            };
    }
}

async function hashPassword(password){
    return await argon2.hash(password);
}

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

module.exports={
    getExpiredMeals ,
    getActiveMeals,
    getAllActiveMeals,
    getPickupWindows ,
    getMealTags ,
    getAllergens ,
    searchListingsImages ,
    getRequestsPerListing ,
    getRequestsInfoPerListing ,
    getRequestPerUsr ,
    updatePostImg ,
    hashPassword ,
    verifyPassword
};