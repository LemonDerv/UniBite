const express = require('express');
const appRouter = express.Router();
const pool = require('../../db.js');

/* start of month for stats*/
const getStartOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

appRouter.get('/meals-this-month', async (req, res) => {
  const startOfMonth = getStartOfMonth();
  const query = `
    SELECT COUNT(*) AS total_meals FROM deliveries
    WHERE status IN ('DELIVERED', 'COMPLETED') AND del_time >= ?;
  `;
  try {
    const [rows] = await pool.query(query, [startOfMonth]);
    res.json({ total_meals: rows[0].total_meals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

appRouter.get('/top-donor', async (req, res) => {
  const query = `
    SELECT u.usr_username, s.given_meals
    FROM student s JOIN user u ON s.std_id = u.usr_id
    ORDER BY s.given_meals DESC
    LIMIT 1;
  `;
  try {
    const [rows] = await pool.query(query);
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

appRouter.get('/top-posts', async (req, res) => {
  const query = `
    SELECT lst_id, title, lst_rating
    FROM listing
    WHERE lst_rating IS NOT NULL
    ORDER BY lst_rating DESC
    LIMIT 5;
  `;
  try {
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

appRouter.get('/post-details/:lst_id', async (req, res) => {
  const { lst_id } = req.params;
  const query = `
    SELECT
    l.created_at, l.lst_rating, u.usr_username AS poster_name,
    COUNT(DISTINCT d.del_id) AS delivered_portions
    FROM listing l JOIN user u ON l.poster = u.usr_id
    LEFT JOIN requests r ON l.lst_id = r.lst_id
    LEFT JOIN deliveries d ON r.rq_id = d.req_id AND d.status IN ('DELIVERED', 'COMPLETED')
    WHERE l.lst_id = ?
    GROUP BY l.lst_id;
  `;
  try {
    const [rows] = await pool.query(query, [lst_id]);
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = appRouter;