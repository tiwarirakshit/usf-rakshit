require('dotenv').config();
const toobusy = require('node-toobusy');
const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
// const loggerutil = require('./utilities/logger');
const datalogger = require('./utilities/datalogger');
const fs = require('fs');
const rfs = require('rotating-file-stream');
const helmet = require('helmet');
const compression = require('compression');
const db = require('./dbconfig');
const { create } = require('express-handlebars');
const cors = require('cors');
const corsOptions = require('./config/corsOptions');
const { Logger } = require('./middleware/logEvents');
const errorHandler = require('./middleware/errorHandler');
const credentials = require('./middleware/credentials');

// Defining routes
const routes = require('./routes');

// Generating an express app
const app = express();

app.set('trust proxy', true);
// Express Status Monitor for monitoring server status
app.use(require('express-status-monitor')({
  title: 'Server Status',
  path: '/status',
  spans: [{
    interval: 1,
    retention: 60
  }, {
    interval: 5,
    retention: 60
  }, {
    interval: 15,
    retention: 60
  }],
  chartVisibility: {
    cpu: true,
    mem: true,
    load: true,
    eventLoop: true,
    heap: true,
    responseTime: true,
    rps: true,
    statusCodes: true
  },
  healthChecks: [{
    protocol: 'http',
    host: 'localhost',
    path: '/',
    port: '3000'
  }],
}));

// compress all responses
app.use(compression());

// middleware which blocks requests when server is too busy
// app.use(function (req, res, next) {
//   if (toobusy()) {
//     res.status(503);
//     res.send("Server is busy right now, sorry.");
//   } else {
//     next();
//   }
// });

// Linking log folder and ensure directory exists
const logDirectory = path.join(__dirname, 'log');
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
fs.appendFile('./log/ServerData.log', '', function (err) {
  if (err) throw err;
});

// view engine setup - Express-Handlebars
app.set('view engine', 'hbs');

const hbs = create({
  layoutsDir: __dirname + '/views/layouts',
  extname: 'hbs',
  defaultLayout: 'homeLayout',
  partialsDir: __dirname + '/views/partials/',
});

app.engine('hbs', hbs.engine);
app.set('views', path.join(__dirname, 'views'));

// Create a rotating write stream
const accessLogStream = rfs.createStream('Server.log', {
  size: "10M", // rotate every 10 MegaBytes written
  interval: '1d', // rotate daily
  compress: "gzip", // compress rotated files
  path: logDirectory
});

// Generating date and time for logger
logger.token('datetime', function displayTime() {
  return new Date().toString();
});

// Allowing access headers and requests
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "HEAD, OPTIONS, GET, POST, PUT, PATCH, DELETE, CONNECT");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});


// defining mode of logging
app.use(logger('dev'));
app.use(logger(':remote-addr :remote-user :datetime :req[header] :method :url HTTP/:http-version :status :res[content-length] :res[header] :response-time[digits] :referrer :user-agent', {
  stream: accessLogStream
}));

// uncomment to redirect global console object to log file
datalogger.logfile();

// Helmet helps for securing Express apps by setting continues HTTP headers
// app.use(helmet());
// app.use(
//   helmet({
//     contentSecurityPolicy: false,
//   })
// );


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// custom middleware logger
app.use(Logger);

// Handle options credentials check - before CORS!
// and fetch cookies credentials requirement
app.use(credentials);

// Cross Origin Resource Sharing
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.use(favicon(path.join(__dirname, 'public', 'ficon.ico')));

// Linking routes
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  // uncomment to just send error as JSON
  // res.send({ "message": "404 Page Not Found..!" });
  // uncomment to render the error page
  res.render('error', { title: "404 Error", layout: "" });
});

// globally catching unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at promise ' + promise + ' reason ', reason);
  console.log('Server is still running...\n');
});

// globally catching unhandled exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception is thrown with ', error + '\n');
  process.exit();
});


app.use(errorHandler);

db.connect()
  .then(() => console.log('Mongo Database connected...'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

module.exports = app;
