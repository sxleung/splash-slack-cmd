// Import express and request modules
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var http = require('http');
var promise = require('promise');
var Q = require('q');

// reference expression that works for all URLs
// var expression = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/i;


// regular expression URL must start with http:// or https:// and end with splashthat.com

var expression = /\b((?:https?:(?:\/{2,3})[a-z0-9.\-]+splashthat.com))/;

/*** RegEx play area
// WIP
// var expression = /\b((?:https?:(?:\/{1,3})|[a-z0-9.\-]+[.][a-z]{2,4}\/))/i;
// |[a-z0-9%])[.]|[a-z0-9.\-]+[.](?:com|net|org|edu|gov)/\b/?(?!@)));

***/

var regex = new RegExp(expression);

const url = require('url');

// Store our app's ID and Secret. These we got from Step 1. 
// For this POC, we'll keep your API credentials right here. But for an actual app, you'll want to  store them securely in environment variables. 
var clientId = '381957551717.382997388977';
var clientSecret = 'a2bda3befed34ab69ff3ad43606d444b';

// Instantiates Express and assigns our app variable to it
var app = express();

// initialization of body-parser to parse req parameters
app.use(bodyParser.json());    // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies

// Again, we define a port we want to listen to
const PORT=4390;

/// splash constants hardcoded 
/// change later

const splash_client_id='100064_e272c5b0d9e1243e8309e5acf432ca4f51c7dfac359b6160751914dd3390afb7';
const splash_client_secret='9eb576a69d3fbaecd1bf044c5b63ab06476cca6f7a488364a1a2a61c7dfdc946';
const splash_api_url='https://prod-api.splashthat.com';
const splash_email='sxleung@gmail.com';
const splash_password='BamadEabthyros2';

//using globals to save time

var splash_refresh_token = '';
var splash_access_token = '';
var splash_events; 
var splash_event_guests;
var slack_resp_url;

function initialize_splash () {
  return new Promise(function(resolve, reject) {
    request({ 
        url: splash_api_url+'/oauth/v2/token', //URL to hit
        qs: {client_id: splash_client_id, client_secret: splash_client_secret, grant_type: 'password', scope: 'user', username: splash_email, password: splash_password}, //Query string data
        method: 'GET', //Specify the method
        json: true 
      }, (err, res, body) => {
        if (err) { 
          console.log('Error occurred with initialize_splash');
          console.log(err);
          reject(err);
        } else {
          splash_access_token=body.access_token;
          splash_refresh_token=body.refresh_token;
          console.log('Connected to Splash!');
          console.log('access_token: '+splash_access_token);
          resolve(splash_access_token);
        }
      })

  })
}

function get_splash_events () {
	var message = {
		"text": "Here is a list of your events",
		"attachments": []
	};
    if (splash_access_token !== '') {
      return new Promise (function(resolve, reject) {
        request({ 
            url: splash_api_url+'/events?limit=50&viewGroups[]=splashHubList', //URL to hit
            auth: {'bearer': splash_access_token}, 
            method: 'GET', //Specify the method
            json: true 
          }, (err, res, body) => {
            if (err) { 
              console.log('Error occurred with get_splash_events');
              console.log(err);
              reject(err);
            } else {
              console.log('Retrieved events from splash');
              //console.log(splash_events);
              splash_events = body.data;
              // construct a formatted slack response
              for (var i=0; i<splash_events.length; i++) {
	              message.attachments.push ({
	              		"color": "#2eb886",
          				"thumb_url": splash_events[i].event_setting.event_cards.x1,
	              		"title": splash_events[i].domain,
	              		"title_link": "https://"+splash_events[i].domain+".splashthat.com",
	              		"text": "Event ID: "+splash_events[i].id
	              	});
              }

              sendMessageToSlackResponseURL(slack_resp_url,message);
              resolve(splash_events);
            }
         });
      });
    }
}

function get_splash_guestlist (event) {
    if (splash_access_token !== '') {
      return new Promise (function(resolve, reject) {
        request({ 
            url: splash_api_url+'/events/'+event.id+'/guestlist/status/counts', //URL to hit
            auth: {'bearer': splash_access_token}, 
            method: 'GET', //Specify the method
            json: true 
          }, (err, res, body) => {
            if (err) { 
              console.log('Error occurred with get_splash_guestlist');
              console.log(err);
              reject(err);
            } else {
              console.log('Retrieved guestlist for '+event.domain);
              splash_event_guests = body.data;
              //console.log(splash_event_guests);
              var message = {
              	"text": "Here is the guest info for "+event.domain,
              	"attachments": [{            
              		"fallback": "Event Date: "+event.event_start+ "\n"+
		              	"Event Owner: "+event.event_owner_email+"\n"+
		              	"Event ID: "+event.id,
	              	"color": "#2eb886",
  	              	"title": event.title,
  	              	"title_link": "https://"+event.domain+".splashthat.com",
	              	"text": "Event Date: "+event.event_start+ "\n"+
		              	"Event Owner: "+event.event_owner_email+"\n"+
		              	"Event ID: "+event.id, 
              		"fields": [
	              		{
	              			"title": "Invited",
	              			"value": splash_event_guests[1].count,
	              			"short": true
	              		},
	              		{
	              			"title": "Waitlisted",
	              			"value": splash_event_guests[2].count,
	              			"short": true
	              		},
	              		{
	              			"title": "RSVP - Yes",
	              			"value": splash_event_guests[4].count,
	              			"short": true
	              		},
	              		{
	              			"title": "RSVP - No",
	              			"value": splash_event_guests[3].count,
	              			"short": true
	              		},

/*	              		{
	              			"title": "Added",
	              			"value": splash_event_guests[0].count,
	              			"short": true
	              		},
removed this to have an even number of tiles */
	              		{
	              			"title": "Checked In - Yes",
	              			"value": splash_event_guests[5].count,
	              			"short": true
	              		},
	              		{
	              			"title": "Checked In - No",
	              			"value": splash_event_guests[6].count,
	              			"short": true
	              		}
              		],
              		"image_url": event.event_setting.event_cards.x2
              	}]
              };
              //console.log(message);
              sendMessageToSlackResponseURL(slack_resp_url, message);
              resolve(event);
            }
         });
      });
    }	
}

/// splash functions

/// slack functions

function sendMessageToSlackResponseURL(responseURL, JSONmessage){
    var postOptions = {
        uri: responseURL,
        method: 'POST',
        headers: {
            'Content-type': 'application/json'
        },
        json: JSONmessage
    }
    request(postOptions, (error, response, body) => {
        if (error){
            console.log(error);
        }
    })
}

/// slack functions


// Lets start our server
app.listen(PORT, function () {
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Splash app listening on port " + PORT);
});


// This route handles GET requests to our root address and responds with a message that we're running
app.get('/', function(req, res) {
//    console.log('SplashBot is running' + req.url);
    res.send('SplashBot is working! Path Hit: ' + req.url);
});

// This route handles get request to a /oauth endpoint. We'll use this endpoint for handling the logic of the Slack oAuth process behind our app.
app.get('/oauth', function(req, res) {
    // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint. If that code is not there, we respond with an error message
    if (!req.query.code) {
        res.status(500);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    } else {
        // If it's there...
        // We'll do a GET call to Slack's `oauth.access` endpoint, passing our app's client ID, client secret, and the code we just got as query parameters.
        request({
            url: 'https://slack.com/api/oauth.access', //URL to hit
            qs: {code: req.query.code, client_id: clientId, client_secret: clientSecret}, //Query string data
            method: 'GET', //Specify the method

        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else {
                res.json(body);
            }
        })
    }
}); 

// Route the endpoint that our splash command will point to and send back a simple response 
app.post('/command', (req, res) => {
   //console.log ('callbacks to slack should go to: '+req.body.response_url);
   slack_resp_url = req.body.response_url;
   //console.log(req.body.text);
	
	var action = req.body.text;
	var event = null;

	if (splash_events!=null) {
		event = splash_events.find(t => t.domain==action || t.id==action);
	}
	
	if (event!=null) {
		console.log('Getting guest info for '+event.domain);
		get_splash_guestlist(event);
	} else {
		console.log("Refreshing event list");
		get_splash_events();
	}
	res.send("Uno momento por favor...");
});

// call splash and get a token for future calls
initialize_splash();

