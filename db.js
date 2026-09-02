const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "UNIBITES_DB",
    timezone: '+00:00'
});

module.exports = pool;