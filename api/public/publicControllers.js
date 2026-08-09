const express = require('express');
const appRouter = express.Router();
const pool = require('../../db.js');
const { searchListingsImages } = require("../utilities.js");


//active listings in total
appRouter.get('/stats', async (req, res) => {
    try {
        const [postCount] = await pool.query(`
            SELECT COUNT(*) AS count FROM listing
            WHERE status IN ('ACTIVE', 'FULL')
        `);

        const [userCount] = await pool.query(`
            SELECT COUNT(*) AS count FROM student
        `);

        const [mealCount] = await pool.query(`
            SELECT COUNT(*) AS count FROM deliveries
            WHERE status IN ('COMPLETED', 'DELIVERED')
        `);

        res.json({
            postCount: postCount[0].count,
            userCount: userCount[0].count,
            mealCount: mealCount[0].count
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// active listings for carousel preview
appRouter.get('/public-meals', async (req, res) => {
    try {
        const [activeMeals] = await pool.query(`
            SELECT * FROM listing
            WHERE status IN ('ACTIVE', 'FULL') AND expires_at > NOW()
            ORDER BY created_at DESC
        `);
        const lst_ids = activeMeals.map(meal => meal.lst_id);

        // fetch images for the listings
        const { success_status, status, message, status_code, body: images } = await searchListingsImages(lst_ids);
        if (!success_status) {
            console.log("Error fetching images:", message);
        }

            /*FINAL MEALS*/ 
        const meals = activeMeals.map(meal=>{
            return {
                ...meal,
                imgUrl : images[meal.lst_id] ?? ''
            }
        });
        res.json({ body: meals });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = appRouter;

