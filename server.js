var app 			 = require('express')();
var http 			 = require('http').Server(app);
var io 				 = require('socket.io')(http);
var mongoose 		 = require('mongoose');
var fs 				 = require('fs');

require('./db/initMongooseLocal')();
require('mongoose-pagination');

//Models
var User 			 = mongoose.model('User');
var Message 		 = mongoose.model('Message');
var Server 			 = mongoose.model('Server');
var Channel 		 = mongoose.model('Channel');
var Role 			 = mongoose.model('Role');

var bodyParser 		 = require('body-parser');
var mongoosePaginate = require('mongoose-paginate');

var port 			 = process.env.PORT || 3000;


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));


var currentUsers = [];
//TODO if empty add messages from db
var numOfMsgs;
var lastMsgs = [];



//Objects
/*
var server_inst = {
	id: ObjectId,
	title: string,
	current_users: [],
	users: [],
	roles: [],
	channels: [],
	img: {
		data,
		contentType
	}
};
*/

var servers = [];


//Init servers
Server.find({}, function(err, data){
	console.log("Servers initialization...");
	if(err){
		alert("Init servers failed!");
	}
	for(let a = 0; a < data.length; a++){
		servers[a] = {
			id: data[a].id,
			title: data[a].title,
			current_users: [],
			users: data[a].users,
			roles: data[a].roles,
			channels: data[a].channels,
			img: {
				data: data[a].img.data,
				contentType: data[a].img.contentType
			}
		}
		console.log("Server #" + a + " '"+ data[a].title+"'");
	}
	
	//Create 'Global'
	if(servers.length == 0){
		console.log("Global created.");
		var newChannel = new Channel({
			title: 'General'
		});
		//Save to DB
		newChannel.save(function(err, channel) {
			if (err) {
				res.send({
					success: false,
					msg: "Channel save error"
				});
				return;
			}
			var newServer = new Server({
				title: 'Global',
				channels: channel.id,
				img: {
					data: fs.readFileSync('imgs/global.png'),
					contentType: 'image/png'
				}
			});
			
			console.log("New channel '" + "General" + "' created");
			
			//Save to DB
			newServer.save(function(err, server) {
				if (err) {
					res.send({
						success: false,
						msg: "Server save error"
					});
					return;
				}
				
				console.log("New server '" + 'Global' + "' created");
				
				//Add to inited servers
				servers.push({
					id: server.id,
					title: 'Global',
					current_users: [],
					users: server.users,
					roles: server.roles,
					channels: server.channels,
					img: {
						data: server.img.data,
						contentType: server.img.contentType
					}
				});
				
			});
		});
	}
	
	console.log("Servers initialized.");
	
	// Register Test user
	if(true){
		var newUser = new User({
				username: 'test',
				password: 'test',
				servers: servers[0].id
		});
		newUser.save(function(err, user) {
			if (err) {
				console.log("Saving test user failed.");
				return;
			}
			
			// Push new user to 'Global' server in DB
			Server.findByIdAndUpdate(
				servers[0].id,
				{$push: {"users": user.username}},
				{safe: true, upsert: true},
				function(err, model) {
					console.log(err);
				}
			);
			
			console.log("Saving test user finished.");
		})
	}
});


// API
	// Test
	app.get('/', function(req, res) {
		res.send('<h1>Pandora chat</h1>');
	});


	// Login
	app.post('/login', function(req, res) {
		// Test
		console.log("/login : " + req.body);
		
		if (currentUsers.indexOf(req.body.user_login) != -1) {
			res.send({
				success: false,
				msg: "Already logged in"
			});
			return;
		}

		User.findOne({
			username: req.body.user_login
		}, function(err, user) {
			if (err || !user) {
				res.send({
					success: false,
					msg: "No such user"
				})
				return;
			}

			user.comparePassword(req.body.user_password, function(err, isMatch) {
				if (err) throw err;
				if (isMatch) {
					res.send({
						success: true,
						user: user
					});
				} else {
					res.send({
						success: false,
						msg: "Password Incorrect"
					})
				}
			});
		});
	})


	// Create
		// New User
		app.post('/register', function(req, res) {
			// Test
			console.log("/register: "+req.body);
			
			var newUser = new User({
				username: req.body.user_login,
				password: req.body.user_password,
				servers: servers[0].id
			});
			// Save to DB
			newUser.save(function(err, data) {
				//Error
				if (err) {
					if (err.name == "ValidationError") {
						res.send({
							success: false,
							msg: "Such username already exists"
						});
						return;
					}
					res.send({
						success: false,
						msg: "Save error"
					});
					return;
				}
				
				Server.findByIdAndUpdate(	
					servers[0].id,
					{$push: {"users": req.body.user_login}},
					{safe: true, upsert: true},
					
					function(err, server) {
						if (err || !server) {
							socket.emit('error', "'New user, push in Global' - failed");
							return;
						}
						
						// Success
						res.send({
							success: true,
							user: data
						})
					}
				);
			
			})
		});

		// New Server
		app.post('/server/new', function(req, res) {
			var newChannel = new Channel({
				title: 'General'
			});
			// Save to DB
			newChannel.save(function(err, channel) {
				if (err) {
					res.send({
						success: false,
						msg: "Channel save error"
					});
					return;
				}
				
				var newServer = new Server({
					title: req.body.title,
					channels: channel.id,
					img: {
						data: Buffer.from(req.body.img.data, 'base64'),
						contentType: req.body.img.contentType
					}
				});
				
				// Test
				console.log("New Server req.body.img");
				console.log(req.body.img);
				
				// If no image passed in POST
				if(req.body.img == undefined){
					newServer.img = {
						data: fs.readFileSync('imgs/global.png'),
						contentType: 'image/png'
					}
				}
				
				console.log("New channel '" + "General" + "' created");
				
				// Save to DB
				newServer.save(function(err, server) {
					if (err) {
						res.send({
							success: false,
							msg: "Server save error"
						});
						return;
					}
					
					console.log("New server '" + req.body.title + "' created");
					
					// Add to inited servers
					servers.push({
						id: server.id,
						title: req.body.title,
						current_users: [],
						users: [],
						roles: server.roles,
						channels: server.channels,
						img: {
							data: server.img.data,
							contentType: server.img.contentType
						}
					});
					
					// Send response
					res.send({
						success: true,
						serverId: server.id
					});
				});
			});
		});


// Connection
io.on('connection', function(socket) {
	// Test
    console.log('new connection');

	// Disconnect
    socket.on('disconnect', function() {
		// Test
        console.log(socket.username + ' disconnected');
   
		User.findOne({username: socket.username}, 
			function(err, user) {
				if (err || !user) {
					socket.emit('error', "'Get list of user`s servers' - failed");
					return;
				}
				
				// Join user to servers
				for(let a = 0; a < user.servers.length; a++){
					io.sockets.in(user.servers[a]).emit('user went offline', socket.username);
					
					// Remove user from [current_users] and push to [users]
					for(let b = 0; b < servers.length; b++){
						if(servers[b].id == user.servers[a]){
							servers[b].users.push(user.username);
							servers[b].current_users.splice(currentUsers.indexOf(user.username), 1);
						}
					}
				}
			}
		);
		
    });

    socket.on('chat message', function(msg) {
		// Test
        console.log('message: ' + msg);
		
		// Send everyone on servers
		
		User.findOne({username: msg.username}, 
			function(err, user) {
				if (err || !user) {
					socket.emit('error', "'Get user from DB' - failed");
					return;
				}
					// tell everyone on server
					io.sockets.in(msg.serverId).emit('chat message', msg);
			}
		);
	  
        var message = new Message({
            username: socket.username,
            content: msg.content,
			serverId: msg.serverId,
			channelId: msg.channelId,
			created: msg.created
        });
        message.save(function(err) {
            if (err) throw err;
        });
        lastMsgs.push(message);
        if (lastMsgs.length > 10)
            lastMsgs.shift();
    });

	// When user loaded chat
	socket.on('logged', function(name) {
		// Test
		console.log('logged: ' + name);
		
		socket.username = name;
		
		//socket.lastMsg = numOfMsgs - 10;
		
		
		// Send list of servers
		User.findOne({username: name}, 
			function(err, user) {
				if (err || !user) {
					socket.emit('error', "'Get list of user`s servers' - failed");
					return;
				}
				
				var toSend = [];
				// Join user to servers
				for(let a = 0; a < user.servers.length; a++){
					socket.join(user.servers[a]);
					
					// tell everyone
					io.sockets.in(user.servers[a]).emit('new user online', {username: name, serverId: user.servers[a]});
					
					// Add user to servers in [current_users]
					for(let b = 0; b < servers.length; b++){
						if(servers[b].id == user.servers[a]){
							servers[b].current_users.push(user.username);
							servers[b].users.splice(servers[b].users.indexOf(socket.username), 1);
							toSend.push({
								title: servers[b].title,
								id: servers[b].id,
								img: {
									data: servers[b].img.data,
									contentType: servers[b].img.contentType
								}
							});
							// Test
							console.log("Send server info " + servers[b].img.contentType);
						}
					}
				}
				socket.emit('servers', toSend);
			}
		);
		
	});
	
	socket.on('join server', function(data){
		User.findOneAndUpdate(
		{username: data.username},
		{$push: {"servers": data.serverId}},
		{safe: true, upsert: true},
			function(err, user) {
				if (err || !user) {
					socket.emit('error', "'Join server' - failed");
					return;
				}
				
				// Join user to server
				socket.join(data.serverId);
				
				// tell everyone
				io.sockets.in(data.serverId).emit('new user online', {username: data.username, serverId: data.serverId});
				
				// Add user to server in [current_users]
				for(let b = 0; b < servers.length; b++){
					if(servers[b].id == data.serverId){
						servers[b].current_users.push(user.username);
						
						Server.findByIdAndUpdate(	
							data.serverId,
							{$push: {"users": data.username}},
							{safe: true, upsert: true},
							
							function(err, server) {
								if (err || !server) {
									socket.emit('error', "'Join server' - failed");
									return;
								}
							}
						);
						
						let toSend = {
							title: servers[b].title,
							id: servers[b].id,
							img: {
								data: servers[b].img.data,
								contentType: servers[b].img.contentType
							}
						}
						socket.emit('add server', toSend);
					}
				}
			}
		);
	});
	

	// Send 
		// Send list of current users of selected server
		socket.on('currentUsers',function (serverId){
			for(let a = 0; a < servers.length; a++){
				if(servers[a].id == serverId){
					socket.emit('currentUsers', servers[a].current_users);
				}
			}
		});
		
		// Send list of users of selected server
		socket.on('currentUsers',function (serverId){
			for(let a = 0; a < servers.length; a++){
				if(servers[a].id == serverId){
					socket.emit('users', servers[a].users);
				}
			}
		});

		// Send channels
		socket.on('getChannels', function(serverId){
			Server.findById(serverId, function (err, server) {
				if (err) {
					return handleError(err)
				};	
				
				// Find range of channels 
				Channel.find({'_id': { $in: server.channels}}, function (err, doc){
					socket.emit('channels', doc);
				});		
			})
		});
		
		// Send messages
		socket.on('getMessages',function(data){
			// Test
			console.log("getMessages: "+data);
			
			Message.find(data, function (err, doc){
					if(err){
						console.log('Get messages failed');
					}
					socket.emit('messages', doc);
			});	
		});


	// Typing
	socket.on('typing', function() {
		socket.broadcast.emit('typing', socket.username);
	})

	socket.on('stop typing', function() {
		socket.broadcast.emit('stop typing', socket.username);
	})


	// Load more
	socket.on('load more', function() {
		if(socket.lastMsg == 0){
			socket.emit('load more', "Already all messages");
			return;
		}
		let tmp = socket.lastMsg;
		let tmp_limit = 10;
		if(tmp < 10){
			tmp_limit = tmp; 
			tmp = 10;
		}
		console.log(socket.lastMsg);
		console.log(tmp);
		Message.paginate({}, {
			offset: tmp - 10,
			limit: tmp_limit
		}, function(err, result) {
			if (err) console.log(err);
			console.log(result.docs.length);
			if (result) {
				if(socket.lastMsg < 10)
					socket.lastMsg = 0;
				else
					socket.lastMsg -= 10;
				socket.emit('load more', result.docs);
			}
		});
	})

	Message.count({}, function(err, count) {
		console.log("Number of messages: ", count);
		numOfMsgs = count;
		Message.paginate({}, {
			offset: count < 10 ? 0 : count - 10,
			limit: 10
		}, function(err, result) {
			lastMsgs = result.docs;
			console.log("Messages retrieved" + result+ err)
		});
	});
	

});

http.listen(port, function() {
    console.log('listening on *:' + port);
});

