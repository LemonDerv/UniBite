const express = require("express");
const appRouter = express.Router();
const pool  = require("../../db.js");
const multer =  require('multer');
const storage = multer.memoryStorage();
const upload = multer({storage : storage});

const {getExpiredMeals ,
       getAllActiveMeals ,
       getActiveMeals ,
       getPickupWindows ,
       getMealTags , 
       getAllergens , 
       searchListingsImages , 
       getRequestsPerListing , 
       getRequestsInfoPerListing ,
       updatePostImg ,
       getRequestPerUsr
    }=require("../utilities.js");


/*ACTIVE MEALS PER USER*/ 
appRouter.get('/activeMeals' , async (req,res)=>{
    let activeMeals,tags,pickup_windows,allergens,images,req_count,req_info;
    let success_status,status,message,status_code,body;

    ({success_status,status,message,status_code,body}= await getActiveMeals(req.session.usr_id));
    if(!success_status)
        return res.status(status_code).json({status : status , message:message});
    activeMeals= body;
 
    const lst_id = activeMeals.map(meal=> meal.lst_id);
        
    ({success_status,status,message,status_code,body} = await getRequestsPerListing(lst_id));
    if(!success_status)
        console.log("Status Code : " , status_code , "Message " , message);
    req_count= body;
        
    ({success_status,status,message,status_code,body} = await getRequestsInfoPerListing(lst_id));
    if(!success_status)
        console.log("Status Code : " , status_code , "Message " , message);
    req_info= body;

    const requests  = Object.entries(req_info).reduce((acc,curr)=>{
        acc[curr[0]] ={
            count : req_count[curr[0]],
            info: curr[1]
        };
        return acc;
    },{});

    ({success_status,status,message,status_code,body}= await getPickupWindows(lst_id));
    if(!success_status)
        return res.status(status_code).json({status : status , message:message});
    pickup_windows=body ;   

    ({success_status,status,message,status_code,body}= await getMealTags(lst_id));
    if(!success_status)
        console.log("Status Code : " , status_code , "Message " , message);
    tags =body;

    ({success_status,status,message,status_code,body}= await getAllergens(lst_id));
    if(!success_status)
        console.log("Status Code : " , status_code , "Message " , message);
    allergens=body ;

    ({success_status,status,message,status_code,body}= await searchListingsImages(lst_id));
    if(!success_status)
        console.log("Status Code : " , status_code , "Message " , message);
    images=body;

        /*FINAL MEALS*/ 
    meals = activeMeals.map(meal=>{
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
});

/*EDIT POST*/ 
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
    let success_status,status,message,status_code;
    
    const connection = await pool.getConnection();

    try{
        await connection.beginTransaction();

        await connection.query('UPDATE listing SET  poster=?, title=?, description=?, portions=?, pickup_location=?, pickup_latitude=?, pickup_longitude=? where lst_id=?',
            [req.session.usr_id,title,description,portions,address,long_lat.lat,long_lat.lng,lst_id]);

        /*RESET pickup_window TABLE*/ 
        await connection.query('DELETE FROM pickup_window WHERE lst_id=?',[lst_id]);
        if(pickupWindows.length > 0){
            const pickup_windows = pickupWindows.map(window=>[lst_id , window.start , window.end]); 
            await connection.query('INSERT INTO pickup_window(lst_id,pickup_start,pickup_end) VALUES ? ',[pickup_windows]);
        }
        
        await connection.query('DELETE FROM lst_has_meal_tag WHERE lst_id=?',[lst_id]);
        if(tags.length > 0 ){
            let tags_id = (await connection.query('SELECT mtag_id FROM meal_tag WHERE mtag_type in (?)',[tags]))[0];
            if(tags_id.length >0){
                tags_id = tags_id.map(tag=>[lst_id , tag.mtag_id]);
                await connection.query('INSERT INTO lst_has_meal_tag(lst_id,mtag_id) VALUES ? ',[tags_id]);
            }   
        }

        await connection.query('DELETE FROM lst_has_allergens WHERE lst_id=?',[lst_id]);
        
        if(allergens.length > 0){
            let allergens_id = (await connection.query('SELECT allerg_id FROM allergen WHERE allerg_type in (?)',[allergens]))[0]
            if(allergens_id.length > 0){
                allergens_id = allergens_id.map(allergen=>[lst_id , allergen.allerg_id]);   
                await connection.query('INSERT INTO lst_has_allergens(lst_id,allerg_id) VALUES ? ',[allergens_id]);
            }
        }
        await connection.commit();
    }
    catch(err){
        await connection.rollback();
        console.log("Erro with server : ",err);
        return res.status(500).json({status: "DB/SERVER-ERROR" , message : "Server error."});
    }finally{connection.release();}

    if(req.file){
        ({success_status,status,message,status_code} = await updatePostImg(lst_id,req.body.image,req.body.fileName,req.file.buffer));
        if(!success_status)
            return res.status(status_code).json({status : status , message:message});
    }
    return res.status(200).json({status : "MEAL-EDITED" , message :"Meal succesfully edited"});
});

/*DELETE POST*/ 
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

/*EXPIRED MEALS PER USER*/  
appRouter.get('/expiredMeals',async (req,res)=>{
    let tags,pickup_windows,allergens,images,expiredMeals;
    let success_status,status,message,status_code,body;

    /*EXPIRED MEALS INFORMATION*/ 
    ({success_status,status,message,status_code,body} = await getExpiredMeals(req.session.usr_id));
    if(!success_status)
        return res.status(status_code).json({status : status , message:message});
    expiredMeals= body;

    const lst_id = expiredMeals.map(meal=> meal.lst_id);

    /*PICKUP WINDOWS INFORMATION*/ 
    ({success_status,status,message,status_code,body}  = await getPickupWindows(lst_id));
    if(!success_status)
        return res.status(status_code).json({status : status , message:message});
    pickup_windows = body;

    /*MEAL TAGS*/ 
    ({success_status,status,message,status_code,body}= await getMealTags(lst_id));
    if(!success_status)
        console.log("Status Code : " , status_code , "Message " , message);
    tags=body;

    /*ALLERGENS*/ 
    ({success_status,status,message,status_code,body}= await getAllergens(lst_id));
    if(!success_status)
        console.log("Status Code : " , status_code , "Message " , message);
    allergens=body;

    /*LISTINGS IMAGES*/ 
    ({success_status,status,message,status_code,body}= await searchListingsImages(lst_id));
    if(!success_status)
        console.log("Status Code : " , status_code , "Message " , message);
    images = body;

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

/*ALL ACTIVE MEALS*/ 
appRouter.get('/meals', async (req,res)=>{
    let activeMeals;
    let lst_id,pickup_windows,allergens,meal_tags ;
    let success_status,status,message,status_code,body;

    /*ACTIVE MEALS INFORMATION*/ 
    ({success_status,status,message,status_code,body} = await getAllActiveMeals(req.session.usr_id));
    if(!success_status)
        return res.status(status_code).json({status : status , message:message});
    activeMeals=body;

    lst_id = activeMeals.map(meal=>meal.lst_id);

    /*PICKUP WINDOWS*/ 
    ({success_status,status,message,status_code,body} = await getPickupWindows(lst_id));
    if(!success_status)
        return res.status(status_code).json({status : status , message:message});
    pickup_windows=body;

    /*ALLERGENS*/ 
    ({success_status,status,message,status_code,body} = await getAllergens(lst_id));
    if(!success_status)
        console.log("Status Code : " , status_code , "Message " , message);
    allergens=body;
    /*MEAL TAGS*/ 
    ({success_status,status,message,status_code,body} = await getMealTags(lst_id));
    if(!success_status)
        console.log("Status Code : " , status_code , "Message " , message);
    meal_tags=body;

    /*LISTINGS IMAGES*/ 
    ({success_status,status,message,status_code,body}= await searchListingsImages(lst_id));
    if(!success_status)
        console.log("Status Code : " , status_code , "Message " , message);
    images = body;

    res.status(200).json({body: activeMeals.map(meal=>
        ({
            ...meal,
            pickup_windows :pickup_windows[meal.lst_id],
            allergens :allergens[meal.lst_id] || [],
            meal_tags : meal_tags[meal.lst_id] || [],
            img: images[meal.lst_id] || ''
        })
    )});
})

/*USER REQUESTS(HE CREATED)*/ 
appRouter.get('/requests', async (req,res)=>{
    let lst_id,mealInfo,pickup_windows,allergens,meal_tags,images,requests;
    let success_status,status,message,status_code,body;

    ({success_status,status,message,status_code,body} = await getRequestPerUsr(req.session.usr_id));
    if(!success_status)
        return res.status(status_code).json({status : status , message:message});
    requests = body;

    lst_id = requests.map(request=>request.lst_id);

    mealInfo = (await pool.query("SELECT * FROM listing JOIN user ON poster=usr_id WHERE lst_id IN (?)",[lst_id]))[0];

    if(!mealInfo.length)
        return res.status(404).json({status:"MEALS-NOT_FOUND" , message :"No meals found"});

    ({success_status,status,message,status_code,body} = await getPickupWindows(lst_id));
    if(!success_status)
        return res.status(status_code).json({status : status , message:message});
    pickup_windows = body;

    ({success_status,status,message,status_code,body} = await getAllergens(lst_id));
    if(!success_status)
        console.log("Status Code : " , status_code , "Message " , message);
    allergens = body;

    ({success_status,status,message,status_code,body} = await getMealTags(lst_id));
    if(!success_status)
        console.log("Status Code : " , status_code , "Message " , message);
    meal_tags = body;

    ({success_status,status,message,status_code,body}= await searchListingsImages(lst_id));
    if(!success_status)
        console.log("Status Code : " , status_code , "Message " , message);
    images = body;
    
    res.status(200).json({
        body: mealInfo.map(meal=>({
            ...meal, 
            pickup_windows :pickup_windows[meal.lst_id],
            allergens :allergens[meal.lst_id] || [],
            meal_tags : meal_tags[meal.lst_id] || [],
            img: images[meal.lst_id] || '',
            requests : requests.filter(req => req.lst_id === meal.lst_id)
        }))
    });
});

appRouter.get('/deliveries' , async (req,res)=>{
    let listings ;        
    let finalDeliveries;
    let success_status,status,message,status_code,body;

    ({success_status,status,message,status_code,body} = await getActiveMeals(req.session.usr_id));
    if(!success_status)
        return res.status(status_code).json({status : status , message:message});

    listings = body;

    listings = listings.reduce((acc,curr)=>{
        acc[curr.lst_id] = curr;
        return acc;
    } , {});

    const lst_id= Object.values(listings).map(listing => listing.lst_id);

    const requests = (await pool.query("SELECT status,requests.std_id,lst_id,usr_username ,created_at,rq_id FROM requests JOIN user ON requests.std_id = user.usr_id where lst_id in (?) and status in ('PENDING','ACCEPTED') ",[lst_id]))[0];

    let accRequest = requests.filter(request => request.status==='ACCEPTED');
    accRequest = accRequest.reduce((acc,curr)=>{
        acc[curr.rq_id] = curr;
        return acc;
    } , {});

    const pendRequest = requests.filter(request => request.status==='PENDING');

    const accReqId = Object.keys(accRequest);

    ({success_status,status,message,status_code,body} = await getPickupWindows(lst_id));
    if(!success_status)
        return res.status(status_code).json({status : status , message:message});
    const pickupWindows  = body;

    if(accReqId.length){
        const deliveries = (await pool.query("SELECT * FROM deliveries WHERE status='PENDING' and req_id in (?)",[accReqId]))[0];

        finalDeliveries = deliveries.map(delivery => ({
                meal_info : {
                    lst_id : accRequest[delivery.req_id].lst_id,
                    meal_title : listings[accRequest[delivery.req_id].lst_id].title,
                    location : listings[accRequest[delivery.req_id].lst_id].pickup_location,
                    pickup_windows : pickupWindows[accRequest[delivery.req_id].lst_id]
                },
                del_info : {
                    del_id : delivery.del_id,
                    del_user : accRequest[delivery.req_id].usr_username,
                    del_status : delivery.status
                }
            })
        );
    }

    const finalRequests = pendRequest.map(request => ({
            meal_info : {
                lst_id : request.lst_id,
                meal_title : listings[request.lst_id].title,
                location : listings[request.lst_id].pickup_location,
                pickup_windows : pickupWindows[request.lst_id]
            },
            req_info : {
                req_id : request.rq_id,
                req_user : request.usr_username,
                req_status : request.status
            }
        })
    );

    res.status(200).json({body : {
        deliveries : finalDeliveries || {} ,
        requests : finalRequests || {}
    }});
})

/*PENDING DELIVERIES*/ 
appRouter.get('/pendingDeliveries' , async(req,res)=>{
    let success_status,status,message,status_code,body;
    let tags,pickup_windows,allergens,images;

    try{
        const deliveries = (await pool.query("SELECT * FROM deliveries JOIN requests on deliveries.req_id=requests.rq_id WHERE deliveries.status='PENDING' AND std_id=?" , [req.session.usr_id]))[0];
        const lst = Object.values(deliveries).map(del=>del.del_id);
        
        if(!lst.length)
            return;
        const listings = (await pool.query("SELECT * FROM deliveries join requests on deliveries.req_id=requests.rq_id join listing on requests.lst_id=listing.lst_id join user on listing.poster=user.usr_id where deliveries.del_id in (?)" , [lst]))[0]
        const lst_id = listings.map(lst => lst.lst_id);

        ({success_status,status,message,status_code,body} = await getPickupWindows(lst_id));
        if(!success_status)
            return res.status(status_code).json({status : status , message:message});
        pickup_windows = body;

        ({success_status,status,message,status_code,body} = await getAllergens(lst_id));
        if(!success_status)
            console.log("Status Code : " , status_code , "Message " , message);
        allergens = body;

        ({success_status,status,message,status_code,body} = await getMealTags(lst_id));
        if(!success_status)
            console.log("Status Code : " , status_code , "Message " , message);
        tags = body;

        ({success_status,status,message,status_code,body}= await searchListingsImages(lst_id));
        if(!success_status)
            console.log("Status Code : " , status_code , "Message " , message);

        images = body;

        const final = deliveries.map(delivery=>{
            const listing = listings.find(lst => lst.del_id=== delivery.del_id);
            console.log(listing);
            return {req_info : {
                created_at : listing.created_at
            },
            del_info : {
                del_id : delivery.del_id
            },
            meal_info: {
                title : listing.title ,
                description : listing.description ,
                pickup_location : listing.pickup_location,
                meal_tags : tags[listing.lst_id] || [] ,
                allergens : allergens[listing.lst_id]  || [],
                pickup_windows : pickup_windows[listing.lst_id] ,
                expires_at : listing.expires_at ,
                poster : listing.usr_username ,
                image : images[listing.lst_id] || ""
            }
        }});

        return res.status(200).json({body:final});
    }
    catch(err){
        console.log('Server Error : ', err);
        return res.status(500).json({status:"DB/SERVER-ERROR" , message : "Server Error"});
    };
    
    
});

/*DELIVERIES TO BE RATED*/ 
appRouter.get('/nonRatedDeliveries' , async(req,res)=>{
    try{
        const deliveries = (await pool.query("SELECT * FROM deliveries JOIN requests on deliveries.req_id=requests.rq_id WHERE deliveries.status='DELIVERED' AND std_id=?" , [req.session.usr_id]))[0];
        const lst = Object.values(deliveries).map(del=>del.del_id);
        const listings = (await pool.query("SELECT * FROM deliveries join requests on deliveries.req_id=requests.rq_id join listing on requests.lst_id=listing.lst_id join user on listing.poster=user.usr_id where deliveries.del_id in (?)" , [lst]))[0]
        const lst_id = listings.map(lst => lst.lst_id);

        ({success_status,status,message,status_code,body} = await getPickupWindows(lst_id));
        if(!success_status)
            return res.status(status_code).json({status : status , message:message});
        pickup_windows = body;

        ({success_status,status,message,status_code,body} = await getAllergens(lst_id));
        if(!success_status)
            console.log("Status Code : " , status_code , "Message " , message);
        allergens = body;

        ({success_status,status,message,status_code,body} = await getMealTags(lst_id));
        if(!success_status)
            console.log("Status Code : " , status_code , "Message " , message);
        tags = body;

        ({success_status,status,message,status_code,body}= await searchListingsImages(lst_id));
        if(!success_status)
            console.log("Status Code : " , status_code , "Message " , message);

        images = body;
        const final = deliveries.map(delivery=>{
            const listing = listings.find(lst => lst.del_id=== delivery.del_id);
            console.log(listing);
            return {req_info : {
                created_at : listing.created_at
            },
            del_info : {
                del_id : delivery.del_id
            },
            meal_info: {
                title : listing.title ,
                description : listing.description ,
                pickup_location : listing.pickup_location,
                meal_tags : tags[listing.lst_id] || [] ,
                allergens : allergens[listing.lst_id]  || [],
                pickup_windows : pickup_windows[listing.lst_id] ,
                expires_at : listing.expires_at ,
                poster : listing.usr_username ,
                image : images[listing.lst_id] || ""
            }
        }});

        return res.status(200).json({body:final});
    }
    catch(err){        
        console.log('Server Error : ', err);
        return res.status(500).json({status:"DB/SERVER-ERROR" , message : "Server Error"});
    }
});

/*PAST DELIVERIES*/ 
appRouter.get('/completedDeliveries' , async(req,res)=>{
    try{
        const deliveries = (await pool.query("SELECT * FROM deliveries JOIN requests on deliveries.req_id=requests.rq_id WHERE deliveries.status='COMPLETED' AND std_id=?" , [req.session.usr_id]))[0];
        const lst = Object.values(deliveries).map(del=>del.del_id);
        const listings = (await pool.query("SELECT * FROM deliveries join requests on deliveries.req_id=requests.rq_id join listing on requests.lst_id=listing.lst_id join user on listing.poster=user.usr_id where deliveries.del_id in (?)" , [lst]))[0]
        const lst_id = listings.map(lst => lst.lst_id);

        ({success_status,status,message,status_code,body} = await getPickupWindows(lst_id));
        if(!success_status)
            return res.status(status_code).json({status : status , message:message});
        pickup_windows = body;

        ({success_status,status,message,status_code,body} = await getAllergens(lst_id));
        if(!success_status)
            console.log("Status Code : " , status_code , "Message " , message);
        allergens = body;

        ({success_status,status,message,status_code,body} = await getMealTags(lst_id));
        if(!success_status)
            console.log("Status Code : " , status_code , "Message " , message);
        tags = body;

        ({success_status,status,message,status_code,body}= await searchListingsImages(lst_id));
        if(!success_status)
            console.log("Status Code : " , status_code , "Message " , message);
        images = body;

        const final = deliveries.map(delivery=>{
            const listing = listings.find(lst => lst.del_id=== delivery.del_id);
            console.log(listing);
            return {req_info : {
                created_at : listing.created_at
            },
            del_info : {
                del_id : delivery.del_id
            },
            meal_info: {
                title : listing.title ,
                description : listing.description ,
                pickup_location : listing.pickup_location,
                meal_tags : tags[listing.lst_id] || [] ,
                allergens : allergens[listing.lst_id]  || [],
                pickup_windows : pickup_windows[listing.lst_id] ,
                expires_at : listing.expires_at ,
                poster : listing.usr_username ,
                image : images[listing.lst_id] || ""
            }
        }});

        return res.status(200).json({body:final});
    }
    catch(err){
        console.log('Server Error : ', err);
        return res.status(500).json({status:"DB/SERVER-ERROR" , message : "Server Error"});
    };
});
module.exports = appRouter;