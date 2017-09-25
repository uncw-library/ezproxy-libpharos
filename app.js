var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var async = require('async');
var fs = require('fs');
var Client = require('ssh2-sftp-client');

var ftp = require('./ftp');

var index = require('./routes/index');

var sql = require('mssql');
var sql_config = require('./db');

var app = express();

//Scheduled Jobs

//Schedule a job to run pharos query every 15 minutes
var pharosQuery = setInterval(function(){

  // connect to your database
  sql.connect(sql_config, function (err) {
    if (err) console.log(err);
    else console.log('Connected to ' + sql_config.database + ' on ' + sql_config.server);

    // create Request object
    var request = new sql.Request();
        
     // query to the database and get the records
     request.query('SELECT id FROM users ' +
        'WHERE active=1 AND role_id=4', function (err, recordset) {
         
         if (err) console.log(err)

         //Write records to a text file
         async.eachOf(recordset.recordset, function(record, index, callback){
          if (index == 0) {
            fs.writeFile("./public/files/guest_access.txt", record.id + "\r\n", function(err) {
              if(err) {
                  console.log(err);
              }  
            });   
          } else {
            fs.appendFile("./public/files/guest_access.txt", record.id + "\r\n", function(err) {
              if(err) {
                  console.log(err);
              }   
            });
          }
          callback();
         }, function(err){
            sql.close();  
            console.log('Finished writing file. Let\'s move it to the ezproxy server.');
            //Move the file to ezproxy dev server
            var c = new Client();

            c.connect(ftp).then(() => {
              console.log("connected");
              c.put('./public/files/guest_access.txt', '/home/randall/guest_access.txt');
              console.log("Job completed successfully --");
              var date = new Date();
              console.log(date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds());                              
            })

         });

        });        
     });    
}, 15 * 60 * 1000) //15 Minutes

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
