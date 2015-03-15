//	Load modules
var express = require('express'),
    app = express();
var swig = require('swig');
var moment = require('moment');
var colors = require('colors');
var filewalker = require('filewalker');

var logger = function(text){

    //  Print text to console
    console.log(moment().format('YYYY-MM-DD HH:mm:ss') + ': ' + text);
}

//	Create express logger
var request_logger = function(req, res, next){

	//	Get real client address
	var client_address = req.headers['x-forwarded-for'] == undefined ? req.connection.remoteAddress:req.headers['x-forwarded-for'];

    logger(req.method.green + ' - ' + client_address + ' - ' + req.url);

    //	Continue to express router
    next();
}

//	Set express configures
app.configure(function(){
	//	Set the views directory
    app.set('views', __dirname + '/templates');

    //  Set static directory
    app.use("/static", express.static(__dirname + '/static')); 

    //	We want express to parse html files with the twig template engine
    app.set('view engine', 'swig');
    app.engine('html', swig.renderFile);

    // This section is optional and can be used to configure twig.
    app.set('twig options', { 
        strict_variables: false
    });

    //	Pass to logger before passing to express router
    app.use(request_logger);
    app.use(app.router);
});

//  Listen on port 3000
console.log('Application is now listening on'.green + ' 0.0.0.0:3000'.yellow + '...')
app.listen(3001); 

//  Load views
filewalker('./views')
    .on('file', function(p, s){
        if(p.indexOf('.js') > -1) {
            require('./views/' + p)(app);
        }
    })
.walk();

//  Load models
filewalker('./models')
    .on('file', function(p, s){
        if(p.indexOf('.js') > -1) {
            require('./models/' + p)(app);
        }
    })
.walk();