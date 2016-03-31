var express = require('express');
var bodyParser = require('body-parser');
var http = require('https');
var querystring = require('querystring');
var url = require('url');
var jsonfile = require('jsonfile');
var app = express();


app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: false })); // support encoded bodies

var CLIENT_SECRET_KEY = "bRLiwCsLltGv6r20pUe2WIOJ"
var CLIENT_ID = "534895897275-k9242i3q768bd9ndf8048vurf6pjkslq.apps.googleusercontent.com";
var file = 'refreshTokens.json'
app.get('/checkToken', function (req, res) {
  
  var url_parts = url.parse(req.url, true);
  var query = url_parts.query;
  var user_id = query.id;
  console.log(query.id);
  jsonfile.readFile(file, function(err, obj) {
	res.setHeader('Content-Type', 'application/json');
	if(obj && obj.hasOwnProperty(user_id)) {
		res.send({"tokenPresent":true});
	}
	else{
		res.send({"tokenPresent":false});
	}
  });
  
});

app.post('/search', function (req, res) {
  var user_id = req.body.id;
  var token = req.body.token;
  var search = req.body.search;
  jsonfile.readFile(file, function(err, obj) {

	//obj = JSON.parse(obj);
	if(obj[user_id]) {
	    
        console.dir(obj[user_id])		
		getAuthTokenForRefreshToken(obj[user_id], function (data){
			var parsed = JSON.parse(data);
			getSearchResult(search,parsed.access_token, function(data){
			res.send(data);
			});
		});
	}
	else if (token){

		getAuthandrefreshToken(token, function (data){
			var parsed = JSON.parse(data);
			obj[user_id]=parsed.refresh_token;
			jsonfile.writeFile(file, obj, function (err) {
				console.error(err)
			});
			getSearchResult(search,parsed.access_token, function(data){
			res.send(data);
			});
		});
	
	
	}
	else {
		res.status(400).send('Authorization code not sent in request.');
	}
	
  });
 });

function getSearchResult(searchString, token, callback){

	return http.get({
        host: 'www.googleapis.com',
        path: '/youtube/v3/search?part=snippet&type=video&maxResults=20&q='+searchString,
		headers: {
           'Authorization': 'Bearer '+ token
        },
    }, function(response) {
        // Continuously update stream with data
        var body = '';
        response.on('data', function(d) {
            body += d;
        });
        response.on('end', function() {
            console.log(body);
			callback(body);
        });
    });

}



function getAuthandrefreshToken(codeString, callback) {
    
	var post_data = querystring.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET_KEY,
      grant_type: 'authorization_code',
      code: codeString
  });

  // An object of options to indicate where to post to
  var post_options = {
      host: 'www.googleapis.com',
      path: '/oauth2/v4/token',
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
		  'Content-Length': Buffer.byteLength(post_data)
      }
  };
  var body = ''; 
  // Set up the request
  var post_req = http.request(post_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (d) {
          body += d;
      });
	  res.on('end', function() {
         // Data reception is done, do whatever with it!
         console.log("Auth token query"+body);
         callback(body);
      });
  });

  // post the data
  post_req.write(post_data);
  post_req.end();
	
}

function getAuthTokenForRefreshToken(codeString, callback) {
    
	var post_data = querystring.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET_KEY,
      grant_type: 'refresh_token',
      refresh_token: codeString
  });

  // An object of options to indicate where to post to
  var post_options = {
      host: 'www.googleapis.com',
      path: '/oauth2/v4/token',
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
		  'Content-Length': Buffer.byteLength(post_data)
      }
  };
  var body = ''; 
  // Set up the request
  var post_req = http.request(post_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (d) {
          body += d;
      });
	  res.on('end', function() {
         // Data reception is done, do whatever with it!
         console.log("Refresh token query"+body);
         callback(body);
      });
  });

  // post the data
  post_req.write(post_data);
  post_req.end();
	
}

app.listen(80, function () {
  console.log('Hackit app listening on port 80!');
});