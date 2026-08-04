const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "1422005",
    database: "UNIBITES_DB",
    timezone: '+00:00'
});

module.exports = pool;