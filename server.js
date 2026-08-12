const express = require("express");
const app = express();
const cors = require("cors");
const session = require("express-session");
const cron = require('node-cron');
const pool = require("./db.js");

app.use(cors());

/* For Post req*/
app.use(express.json());
app.use(express.urlencoded({extended: true}));

/* NO NEED TO '/public' .*/
app.use(express.static("public"));

/* CONFIG FOR SESSION*/ 
app.use(session({
    secret:"keyboard cat",
    resave:false,
    saveUninitialized: true,
    cookie:{
        secure: false,
        httpOnly:true,
        maxAge: 60 * 60 * 24 * 1000
    }
}));

/*USE PUBLIC ROUTER*/ 
const publicRoutes = require("./api/public/publicControllers");
app.use('/api/public',publicRoutes);

const userRoutes = require("./api/user/userControllers");
app.use('/api/user',userRoutes);

const adminRoutes = require("./api/admin/adminControllers");
app.use('/api/admin',adminRoutes);

/*USE MIDDLEWARE ROUTER*/
const middlewareRouter = require('./api/middleware');
app.use('/private',middlewareRouter);

/*USE POST ROUTER*/ 
const postRouter = require("./api/posts/postsControllers");
app.use('/api/posts',postRouter);

/* FOR THE AUTH MIDDLEWARE*/
app.use('/private',express.static('private'));

//ACTIVE -> EXPIRED AFTER 48H 
const task = cron.schedule('0 * * * *', async ()=>{
    const connection = await pool.getConnection();
    
    try{
        await connection.beginTransaction();
        await connection.query("UPDATE listing SET status='EXPIRED' WHERE expires_at < NOW() AND status IN ('ACTIVE', 'FULL')");
        await connection.commit();
    }
    catch(err){
        await connection.rollback();
        console.log(err);
    }
    finally{await connection.release()};
});

task.on('execution:missed', () => {
  task.execute();
});

// FOR DELIVERIES, DELIVERED -> REJECTED AFTER 48H SINCE del_time
const deliveryTask = cron.schedule('0 * * * *', async () => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(`
            UPDATE deliveries
            SET status = 'REJECTED'
            WHERE del_time < DATE_SUB(NOW(), INTERVAL 48 HOUR)
              AND status = 'DELIVERED'
        `);
        await connection.commit();
    }
    catch (err) {
        await connection.rollback();
        console.log(err);
    }
    finally {
        await connection.release();
    }
});

deliveryTask.on('execution:missed', () => {
    deliveryTask.execute();
});


app.listen(3000,()=>{
    console.log("Running ");
});