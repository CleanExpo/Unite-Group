// POSITIVE CONTROL — deliberately vulnerable. Never import this file.
const express = require('express');
const { exec } = require('child_process');
const app = express();
app.get('/user', async (req, res) => {
  const rows = await db.query(`SELECT * FROM users WHERE id = '${req.query.id}'`);
  res.send(`<h1>Hello ${req.query.name}</h1>` + JSON.stringify(rows));
});
app.get('/ping', (req, res) => exec('ping -c 1 ' + req.query.host, (e, out) => res.send(out)));
app.get('/admin/delete', async (req, res) => { await db.query('DELETE FROM tenants WHERE id = $1', [req.query.t]); res.send('ok'); });
