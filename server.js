const express = require("express");
const app = express();
const cors = require("cors");

// user Routes
const userRoutes = require("./api/user/userControllers");

app.use(cors());

app.use(express.json());

app.use(express.static("public"));

app.use(express.urlencoded({extended: true}));

app.use('/api/user',userRoutes);

app.use('/private',express.static('private'));

app.listen(3000,()=>{
    console.log("Running ");
});

