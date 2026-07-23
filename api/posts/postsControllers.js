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

appRouter.get('/meals' , async (req,res)=>{
    const connection = await pool.getConnection();
    
    try{
        await connection.beginTransaction();    
        let meals = (await connection.query("SELECT * from listing where poster= ? ",[req.session.usr_id]))[0];
        const lst_id = meals.map(meal=> meal.lst_id);
        
        const req_count = (await connection.query("SELECT count(rq_id),lst_id from requests where lst_id in(?) group by lst_id" , [lst_id]))[0].reduce((acc,curr)=>{
            acc[curr.lst_id] = curr['count(rq_id)'];
            return acc;
        },{});
        
        const req_info = (await connection.query("SELECT requests.std_id,lst_id,usr_username ,created_at  from requests join user on requests.std_id = user.usr_id where status='PENDING' and lst_id IN(?)",[lst_id]))[0].reduce((acc,curr)=>{
            if(!acc[curr.lst_id]) acc[curr.lst_id] =[];
            acc[curr.lst_id].push([curr.usr_username , curr.created_at]);
            return acc;
        },{});

        const requests  = Object.entries(req_info).reduce((acc,curr)=>{
            acc[curr[0]] ={
                count : req_count[curr[0]],
                info: curr[1]
            };
            return acc;
        },{});

        const tags = (await connection.query('SELECT mtag_type,lst_id FROM lst_has_meal_tag JOIN meal_tag on lst_has_meal_tag.mtag_id = meal_tag.mtag_id where lst_has_meal_tag.lst_id IN (?)',[lst_id]))[0].reduce((acc,curr)=>{
            if(!acc[curr.lst_id])
                acc[curr.lst_id] =[];
            acc[curr.lst_id].push(curr.mtag_type);
            return acc;
        },{});

        const pickup_windows = (await connection.query('SELECT lst_id,pickup_start,pickup_end from pickup_window WHERE lst_id IN (?)',[lst_id]))[0].reduce((acc,curr)=>{
            if(!acc[curr.lst_id])
                acc[curr.lst_id] = [];
            acc[curr.lst_id].push([curr.pickup_start,curr.pickup_end]);
            return acc;
        },{});

        const allergens = (await connection.query('SELECT allerg_type,lst_id FROM lst_has_allergens JOIN allergens on lst_has_allergens.allerg_id=allergens.allerg_id where lst_has_allergens.lst_id in (?)',[lst_id]))[0].reduce((acc,curr)=>{
            if(!acc[curr.lst_id])
                acc[curr.lst_id] = [];
            acc[curr.lst_id].push(curr.allerg_type);
            return acc;
        },{});

        let images =await  cloudstorage.listFiles(process.env.BUCKET_ID);
        const fileIdRegex =new RegExp(`^(${lst_id.join('|')})_.*`);
        images = images.files.filter((img)=> fileIdRegex.test(img.$id));
        
        images = images.reduce((acc,curr)=>{
            const meal = curr.$id.split('_')[0];
            acc[meal] = `${process.env.API_ENDPOINT}/storage/buckets/${process.env.BUCKET_ID}/files/${curr.$id}/view?project=${process.env.PROJECT_ID}`;
            return acc;
        });

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
        await connection.commit();
        res.status(200).json({status:"READY-MEALS",body:meals});
    }
    catch(err){
        await connection.rollback();
        console.log('DB/SERVER ERROR : ', err)
        return res.status(500).json({status:'DB/SERVER-ERROR' , message:'Error getting meals.'});
    }
    finally{connection.release();}
});

appRouter.post('/edit',upload.single('image'),async (req,res)=>{
    /*DATA FROM FRONTEND*/ 
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
        
        await connection.query('delete from pickup_window where lst_id=?',[lst_id]);
        const pickup_windows = pickupWindows.map(window=>[lst_id , window.start , window.end]); 
        await connection.query('insert into pickup_window(lst_id,pickup_start,pickup_end) values ? ',[pickup_windows]);
        
        if(tags.length > 0){
            await connection.query('delete from lst_has_meal_tag where lst_id=?',[lst_id]);
            const tags_id = (await pool.query('select mtag_id from meal_tag where mtag_type in (?)',[tags]))[0].map(tag=>[lst_id , tag.mtag_id]);
            await connection.query('insert into lst_has_meal_tag(lst_id,mtag_id) values ? ',[tags_id]);
        }
        
        if(allergens.length > 0){
            await connection.query('delete from lst_has_allergens where lst_id=?',[lst_id]);
            const allergens_id = (await pool.query('select allerg_id from allergens where allerg_type in (?)',[allergens]))[0].map(allergen=>[lst_id , allergen.allerg_id]);
            await connection.query('insert into lst_has_allergens(lst_id,allerg_id) values ? ',[allergens_id]);
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
            images = images.files.filter((img)=> fileIdRegex.test(img.$id));

            await cloudstorage.deleteFile(process.env.BUCKET_ID, images[0].$id);    

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

module.exports = appRouter;