var createError = require('http-errors');
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var passport = require('passport');
var path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
require('./models/db'); // Database setup and schemas
require('./config/passport'); // Passport setup

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize()); // Initialize passport after the static paths

// Setup CORS function properly
app.use('/', (req, res, next) => {
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT');
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.header('Access-Control-Allow-Origin', 'http://chinyereodinukwe.com');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Require routers
var apiRouter = require('./routes/api');
// Use the routers
app.use('/', apiRouter);

// Error handler for our api
/* When the supplied JWT is invalid, or perhaps doesn’t exist, the middleware throws
an error to prevent the code from continuing. You need to catch this error and return
an unauthorized message and status (401). The error is typically expected from express-jwt */
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    res.status(401)
      .json({ "message": err.name + ": " + err.message });
  }
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
