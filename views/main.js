var async = require('async');
var request = require('request');
var fs = require('fs');

module.exports = function(app){

	//	Site root, loads index.html
	app.get('/', function(req, res){
	    res.render('./index.html');
	});

	//	reddit json loader
	app.get('/loader', function(req, res){

		//	Pull subreddit and after key from request
		var subreddit = req.query.subreddit.replace(" ", "+");
		var after_key = req.query.after != undefined ? '&after=' + req.query.after:'';

		//	Make a request to reddit for the json data
		request('http://www.reddit.com/r/' + subreddit + '.json?count=25' + after_key, function(err, response, subreddit_data){

			//	Turn the json string into an obkect
			subreddit_data = JSON.parse(subreddit_data);
			
			//	This is where the videos will be stored
			var videos = [];

			//	Pattern to match youtube links in URLs
			var pattern = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;

			//	Stores individual video objects
			var video_objects = [];

			//	Item parser - iterates items from the subreddit and pulls data from Youtube
			function item_parser(item, callback){

				//	If the url matches the pattern, we have a youtube link
				if(pattern.test(item.data.url))
				{
					//	Store the matches
					var matches = item.data.url.match(pattern)

					//	Check to see if we have a cache file, this saves us hitting the youtube api
					fs.exists('./cache/' + matches[1] + '.txt', function (exists) {

						//	If the cache doesnt exist...
						if(exists == false){

							//	Make a request to the youtube API for the video data
							request('http://gdata.youtube.com/feeds/api/videos/' + matches[1] + '?alt=json', function(err, response, video_data){

								//	Save that video data to cache for later. This doesnt change
								fs.writeFile('./cache/' + matches[1] + '.txt', video_data, function(err) {

									//	Try and decode the json to an object and add it to the video objects array
									try{
										video_objects.push([item, JSON.parse(video_data)]);
									}catch(e){
									}finally{
										callback();
									}

								});

							});

						}else{

							//	We have a cache file, so read it out...
							fs.readFile('./cache/' + matches[1] + '.txt', 'utf8', function (err, video_data) {

								//	Try and decode the json to an object and add it to the video objects array
								try{
									video_objects.push([item, JSON.parse(video_data)]);
								}catch(e){
								}finally{
									callback();
								}

							});
						}

					});

				}else{
					//	No match, end
					callback();
				}

			}

			//	Object parser loops video objects and adds them to the final videos array
			function object_parser(item, callback){

				//	Build video data object for the front end JS
				videos.push({
					'id': item[1].entry.id.$t.replace('http://gdata.youtube.com/feeds/api/videos/', ''),
					'title': item[1].entry.title.$t,
					'artwork': item[1].entry.media$group.media$thumbnail[0].url,
					'subreddit': item[0].data.subreddit
				})

				//	Done
				callback()
			}

			//	Async loop on the subreddit items using the item parser
			async.each(subreddit_data.data.children, item_parser, function(err){		

				//	Async loop on the video objects using the object parser
				async.each(video_objects, object_parser, function(err){

					//	Build a final result object to return to the browser
					var result = {
						"videos": videos,
						"before": subreddit_data.data.before,
						"after": subreddit_data.data.after
					};

					//	Push json to the browser
					res.json(result)

				})

			});

		})
	});

}