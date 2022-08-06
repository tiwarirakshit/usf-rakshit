const express = require('express');
const app = express();

// Defining all the routes
const admin = require('./routes/admin');

const home = require('./routes/home')

// Linking all the routes
app.use('/', admin);

app.use('/', home);


module.exports = app;
