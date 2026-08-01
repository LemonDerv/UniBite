require('dotenv').config();
const express = require("express");
const appRouter = express.Router();
const pool  = require("../../db.js");
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

appRouter.get('/activeMeals' , async (req,res)=>{

    try{ 
        let meals = (await pool.query("SELECT * FROM activeMeals WHERE poster=?",[req.session.usr_id]))[0];

        if(!meals || meals.length === 0)
            return res.status(404).json({status:"MEALS-NOT_FOUND" , message : 'No Meals found.'});

        /*EXTRACT lst_id's MATCHING THE LOGGED-IN USER*/ 
        const lst_id = meals.map(meal=> meal.lst_id);
        
        let req_count = (await pool.query("SELECT * from countRequests where lst_id in(?) " , [lst_id]))[0];
        req_count = !req_count.length? {} : req_count.reduce((acc,curr)=>{
            acc[curr.lst_id] = curr['count(rq_id)'];
            return acc;
        },{});
        
        let req_info = (await pool.query("SELECT * FROM mealRequests WHERE lst_id IN(?)",[lst_id]))[0];
        req_info = !req_info.length ? {} : req_info.reduce((acc,curr)=>{
            if(!acc[curr.lst_id]) acc[curr.lst_id] =[];
            acc[curr.lst_id].push([curr.usr_username , curr.created_at]);
            return acc;
        },{});

        /*COMBINE INFO AND COUNT FOREACH LISTING*/ 
        const requests  = Object.entries(req_info).reduce((acc,curr)=>{
            acc[curr[0]] ={
                count : req_count[curr[0]],
                info: curr[1]
            };
            return acc;
        },{});

        let tags = (await pool.query('SELECT * FROM tags WHERE tags.lst_id IN (?)',[lst_id]))[0];
        tags = !tags.length ? {} :tags.reduce((acc,curr)=>{
            if(!acc[curr.lst_id])
                acc[curr.lst_id] =[];
            acc[curr.lst_id].push(curr.mtag_type);
            return acc;
        },{});

        let pickup_windows = (await pool.query('SELECT lst_id,pickup_start,pickup_end FROM pickupWindows WHERE lst_id IN (?)',[lst_id]))[0];
        pickup_windows = !pickup_windows.length? {} :pickup_windows.reduce((acc,curr)=>{
            if(!acc[curr.lst_id])
                acc[curr.lst_id] = [];
            acc[curr.lst_id].push([curr.pickup_start,curr.pickup_end]);
            return acc;
        },{});

        let allergens = (await pool.query('SELECT * FROM allergens WHERE allergens.lst_id in (?)',[lst_id]))[0];
        allergens = !allergens.length ? {} : allergens.reduce((acc,curr)=>{
            if(!acc[curr.lst_id])
                acc[curr.lst_id] = [];
            acc[curr.lst_id].push(curr.allerg_type);
            return acc;
        },{});

        let images =await  cloudstorage.listFiles(process.env.BUCKET_ID);
        const fileIdRegex =new RegExp(`^(${lst_id.join('|')})_.*`);
        images = images.files.filter((img)=> fileIdRegex.test(img.$id));
        images = images?.reduce((acc,curr)=>{
            const meal = curr.$id.split('_')[0];
            acc[meal] = `${process.env.API_ENDPOINT}/storage/buckets/${process.env.BUCKET_ID}/files/${curr.$id}/view?project=${process.env.PROJECT_ID}`;
            return acc;
        },{});

        /*FINAL MEALS*/ 
        meals = meals.map(meal=>{
            return {
                ...meal,
                requests:requests[meal.lst_id] ?? 0,
                tags: tags[meal.lst_id] ?? [],
                pickup_windows: pickup_windows[meal.lst_id]?.map(window =>
                    ({
                        start:window[0],
                        end :window[1]
                    })
                ) ?? [],
                allergens : allergens[meal.lst_id] ?? [],
                imgUrl : images[meal.lst_id] ?? ''
            }
        });
        res.status(200).json({status:"READY-MEALS",body:meals});
    }
    catch(err){
        console.log('DB/SERVER ERROR : ', err)
        return res.status(500).json({status:'DB/SERVER-ERROR' , message:'Error getting meals.'});
    }
});

appRouter.post('/edit',upload.single('image'),async (req,res)=>{
    const lst_id = req.body.lst_id;
    const title = req.body.title;
    const description = req.body.description;
    const portions= req.body.portions;
    const address = req.body.address;
    const long_lat = JSON.parse(req.body.long_lat);
    const tags = JSON.parse(req.body.tags);
    const allergens = JSON.parse(req.body.allergens);
    const pickupWindows = JSON.parse(req.body.pickupWindows);
    
    const connection = await pool.getConnection();

    try{
        await connection.beginTransaction();

        await connection.query('UPDATE listing SET  poster=?, title=?, description=?, portions=?, pickup_location=?, pickup_latitude=?, pickup_longitude=? where lst_id=?',
            [req.session.usr_id,title,description,portions,address,long_lat.lat,long_lat.lng,lst_id]);
        /*RESET pickup_window TABLE*/ 
        await connection.query('delete from pickup_window where lst_id=?',[lst_id]);
        if(pickupWindows.length > 0){
            const pickup_windows = pickupWindows.map(window=>[lst_id , window.start , window.end]); 
            await connection.query('INSERT INTO pickup_window(lst_id,pickup_start,pickup_end) VALUES ? ',[pickup_windows]);
        }
        
        await connection.query('DELETE FROM lst_has_meal_tag where lst_id=?',[lst_id]);
        if(tags.length > 0 ){
            let tags_id = (await connection.query('select mtag_id from meal_tag where mtag_type in (?)',[tags]))[0];
            if(tags_id.length >0){
                tags_id = tags_id.map(tag=>[lst_id , tag.mtag_id]);
                await connection.query('insert into lst_has_meal_tag(lst_id,mtag_id) values ? ',[tags_id]);
            }   
        }

        await connection.query('delete from lst_has_allergens where lst_id=?',[lst_id]);
        
        if(allergens.length > 0){
            let allergens_id = (await connection.query('select allerg_id from allergen where allerg_type in (?)',[allergens]))[0]
            if(allergens_id.length > 0){
                allergens_id = allergens_id.map(allergen=>[lst_id , allergen.allerg_id]);   
                await connection.query('insert into lst_has_allergens(lst_id,allerg_id) values ? ',[allergens_id]);
            }
        }

        await connection.commit();
    }
    catch(err){
        await connection.rollback();
        console.log("Erro with server : ",err);
        return res.status(500).json({status: "DB/SERVER-ERROR" , message : "Server error."});
    }finally{connection.release();}

    try{
        if(req.file){
            let images =await  cloudstorage.listFiles(process.env.BUCKET_ID);
            const fileIdRegex =new RegExp(`^${lst_id}_.*`);
            images = images.files.filter((img)=> fileIdRegex.test(img.name));
            if(images.length > 0){
                await cloudstorage.deleteFile(process.env.BUCKET_ID, images[0].$id);    
            }
            const newImageId = `${lst_id}_${req.body.fileName}`;
            const file = req.body.image;
            const inputFile = InputFile.fromBuffer(req.file.buffer, req.body.fileName);
            await  cloudstorage.createFile(process.env.BUCKET_ID, newImageId , inputFile);
        }
    }
    catch(err){
        console.log('Error saving Image : ' ,err);
        return res.status(500).json({status: "CLOUD-STORAGE_ERR" , message : "Cant save the image right now."});
    }

    return res.status(200).json({status : "MEAL-EDITED" , message :"Meal succesfully edited"});
    
});

appRouter.delete('/delete',  async(req,res)=>{
    const post = req.body.post_id;
    if(!post)
        return res.status(400).json({status:'INVALID-POST_ID', message: 'Choose a valid Post.'});
    try{
        const ans = await pool.query('DELETE FROM listing WHERE lst_id=?',[post]);

        if(ans[0].affectedRows ===0)
            return res.status(404).json({status:'POST_NOT-FOUND', message: 'Post not found'});
        else
            return res.status(200).json({status: 'POST-DELETED' , message: 'Post deleted successfully.'});
    }
    catch(err){
        return res.status(500).json({status:'DB/SERVER-ERROR' , message:'Error deleting post.Try again.'});
    }
});

appRouter.get('/expiredMeals',async (req,res)=>{
    let expiredMeals,tags,pickup_windows,allergens,images;

    try{       
        expiredMeals = (await pool.query("SELECT * FROM listing where status='EXPIRED' AND poster=?" , req.session.usr_id))[0];
        if(expiredMeals.length === 0)
            return res.status(404).json({status:"EXPIRED-MEALS-NOT_FOUND" , message : 'No expired Meals found.'});

        const lst_id = expiredMeals.map(meal=> meal.lst_id);

        pickup_windows = (await pool.query('SELECT lst_id,pickup_start,pickup_end from pickup_window WHERE lst_id IN (?)',[lst_id]))[0].reduce((acc,curr)=>{
            if(!acc[curr.lst_id])
            acc[curr.lst_id] = [];
            acc[curr.lst_id].push([curr.pickup_start,curr.pickup_end]);
            return acc;
        },{});

        tags = (await pool.query('SELECT mtag_type,lst_id FROM lst_has_meal_tag JOIN meal_tag on lst_has_meal_tag.mtag_id = meal_tag.mtag_id where lst_has_meal_tag.lst_id IN (?)',[lst_id]))[0];
        tags = !tags.length ? {} : tags.reduce((acc,curr)=>{
                if(!acc[curr.lst_id])
                    acc[curr.lst_id] =[];
                acc[curr.lst_id].push(curr.mtag_type);
                return acc;
            },{});

        allergens = (await pool.query('SELECT allerg_type,lst_id FROM lst_has_allergens JOIN allergen on lst_has_allergens.allerg_id=allergen.allerg_id where lst_has_allergens.lst_id in (?)',[lst_id]))[0];
        allergens = !allergens.length ? {} : allergens.reduce((acc,curr)=>{
            if(!acc[curr.lst_id])
            acc[curr.lst_id] = [];
            acc[curr.lst_id].push(curr.allerg_type);
            return acc;
        },{});
    }
    catch(err){
        console.log("Error with server : ",err);
        return res.status(500).json({status: "DB/SERVER-ERROR" , message : "Server error."});
    }

    try{
        images =await cloudstorage.listFiles(process.env.BUCKET_ID);

        const fileIdRegex =new RegExp(`^(${expiredMeals.map(meal=>meal.lst_id).join('|')})_.*`);
        images = images.files.filter((img)=> fileIdRegex.test(img.$id));
        
        images = images?.reduce((acc,curr)=>{
            const meal = curr.$id.split('_')[0];
            acc[meal] = `${process.env.API_ENDPOINT}/storage/buckets/${process.env.BUCKET_ID}/files/${curr.$id}/view?project=${process.env.PROJECT_ID}`;
            return acc;
        },{});
    }
    catch(err){
        console.log('Image Error: ' ,err);
        return res.status(500).json({status: "CLOUD-STORAGE_ERR" , message : "Cant access the image right now."});
    }

    res.json({body: expiredMeals.map(meal=> {return {
            ...meal ,                 
            tags: tags[meal.lst_id] ?? [],
            pickup_windows: pickup_windows[meal.lst_id]?.map(window =>
                    ({
                        start:window[0],
                        end :window[1]
                    })) ?? [],
            allergens : allergens[meal.lst_id] ?? [],
            img : images[meal.lst_id]
        }})
    });
});

appRouter.get('/meals', async (req,res)=>{
    let meals;
    let lst_id,pickup_windows,allergens,meal_tags ;

    try{
        meals = (await pool.query("SELECT * FROM listing JOIN user ON poster=usr_id WHERE status='ACTIVE'"))[0];

        if(!meals.length)
            return req.status(404).json({status:"MEALS-NOT_FOUND" , message : "Couldnt find meals."});

        lst_id = meals.map(meal=>meal.lst_id);

        pickup_windows = (await pool.query("SELECT * FROM pickup_window WHERE lst_id IN (?)",[lst_id]))[0];
        pickup_windows = pickup_windows.reduce(((acc,curr)=>{
            if(!acc[curr.lst_id]) acc[curr.lst_id] = [];
            acc[curr.lst_id].push({start :curr.pickup_start , end: curr.pickup_end});
            return acc;
        }),{});

        allergens = (await pool.query("SELECT lst_id,allerg_type FROM lst_has_allergens JOIN allergen ON allergen.allerg_id=lst_has_allergens.allerg_id WHERE lst_id IN  (?)" ,[lst_id]))[0];
        if(!allergens.length)
            console.log("Allergens not found.");
        else{
            allergens = allergens.reduce((acc,curr)=>{
                if(!acc[curr.lst_id]) acc[curr.lst_id] = [];
                acc[curr.lst_id].push(curr.allerg_type);
                return acc;
            },{});
        }
        
        meal_tags = (await pool.query("SELECT lst_id,mtag_type FROM lst_has_meal_tag JOIN meal_tag ON meal_tag.mtag_id=lst_has_meal_tag.mtag_id WHERE lst_id IN (?)",[lst_id]))[0];
        if(!meal_tags.length)
            console.log("Meal tags not found");
        else{
            meal_tags = meal_tags.reduce((acc,curr)=>{
                if(!acc[curr.lst_id]) acc[curr.lst_id] = [];
                acc[curr.lst_id].push(curr.mtag_type);
                return acc;
            },{});
        }
    }
    catch(err){console.log('Error with server : ', err)}


    try{
        images =await cloudstorage.listFiles(process.env.BUCKET_ID);

        const fileIdRegex =new RegExp(`^(${lst_id.join('|')})_.*`);
        images = images.files.filter((img)=> fileIdRegex.test(img.$id));
        
        images = images?.reduce((acc,curr)=>{
            const meal = curr.$id.split('_')[0];
            acc[meal] = `${process.env.API_ENDPOINT}/storage/buckets/${process.env.BUCKET_ID}/files/${curr.$id}/view?project=${process.env.PROJECT_ID}`;
            return acc;
        },{});
    }
    catch(err){
        console.log('Image Error: ' ,err);
        return res.status(500).json({status: "CLOUD-STORAGE_ERR" , message : "Cant access the image right now."});
    }
    
    res.status(200).json({body: meals.map(meal=>
        ({
            ...meal,
            pickup_windows :pickup_windows[meal.lst_id],
            allergens :allergens[meal.lst_id] || [],
            meal_tags : meal_tags[meal.lst_id] || [],
            img: images[meal.lst_id] || ''
        })
    )});
})


module.exports = appRouter;