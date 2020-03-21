/*
!banana <cmd>
    raise : raise your hand (queue user)
    lower : lower next person's hand (dequeue)
    who : next hand raiser in the queue (peek)
    hands: how many hands are raised (peek)

*/

var Discord = require('discord.js');
var logger = require('winston');
var auth = require('./auth.json');
var https = require('https');

var channelQueues = {};
var channelMaps = {};
var lockDown = false;
var debug = true;

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

// Initialize Discord Bot
const bot = new Discord.Client()

bot.once('ready', () => {
	logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.user.username + ' - (' + bot.user.id + ')');
});

bot.login(auth.token);

bot.on('message', m => {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    var message = m.content;

    var server = m.guild;
    var serverId = server.id;

    var channel = m.channel;
    var channelId = channel.id;
    
    var user = m.author;
    var userId = user.id;
    var username = user.username;
    
    if(message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];
        var subCmd = "";
        if(args.length > 1)
            subCmd = args[1];

        switch(cmd) {
            // !banana 
            case 'banana':
                
                var handQueue = [];
                var handMap = {};
                if(channelId in channelQueues) {
                    handQueue = channelQueues[channelId];
                    handMap = channelMaps[channelId];
                } else {
                    channelQueues[channelId] = handQueue;
                    channelMaps[channelId] = handMap;
                }

                var roleId = "";
                
                server.roles.cache.each(role => {
                    if(role.name == "hand raised"){
                        roleId = role.id
                    }
                })

                var member = server.members.cache.get(userId);
                var role = server.roles.fetch(roleId);
                var destChannelId = channelId;

                switch(subCmd) {
                    
                    case 'help':
                        channel.send("!banana raise|lower|who");
                        break;

                    case 'raise':
                        if(username in handMap) {
                            channel.send("Your hand is already raised");
                            return;
                        }

                        handQueue.push(username);
                        handMap[username] = username;

                        setHandRaiseRole(serverId, userId, roleId, true);

                        channel.send(handQueue.length + " hand(s) raised")

                        if(debug)
                            printQueue(channelId);
                        break;

                    case 'lower':
                        if(lockDown && username != "docrob") {
                            channel.send(username + " is not authorized to lower hands :(");
                            return;
                        }
                        if(handQueue.length < 1) {
                            channel.send("No one has raised their hand");
                            return;
                        }
                        var removedUser = handQueue[0];
                        handQueue.shift();
                        delete handMap[username];

                        setHandRaiseRole(serverId, userId, roleId, false);

                        channel.send(removedUser + " is next (hand lowered)");
                        channel.send(handQueue.length + " hand(s) raised")
                        if(debug)
                            printQueue(channelId);
                        break;

                    case 'who':
                        if(lockDown && username != "docrob") {
                            channel.send(username + " is not authorized to ask who is next :(");
                            return;
                        }
                        if(handQueue.length < 1) {
                            channel.send("No one has raised their hand");
                            return;
                        }
                        var removedUser = handQueue[0];
                        channel.send( removedUser + " is next");
                        if(debug)
                            printQueue(channelId);
                        break;
                    
                    case 'hands':
                        if(lockDown && username != "docrob") {
                            channel.send(username + " is not authorized to ask how many hands are raised :(");
                            return;
                        }
                        channel.send(handQueue.length + " hand(s) raised")
                        break;

                    }
            break;
         }
     }
});

function setHandRaiseRole(serverId, userId, roleId, raiseHand) {
    var methodValue = "DELETE";
    if(raiseHand)
        methodValue = "PUT";
    var options = {
        method: methodValue, 
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bot " + auth.token
        }
    };

    var url = "https://discordapp.com/api" + "/guilds/" + serverId + "/members/" + userId + "/roles/" + roleId;
    var req = https.request(url, options, function (res) {
        var responseString = "";

        res.on("data", function (data) {
            responseString += data;
            // save all the data from response
        });
        res.on("end", function () {
        });
    });
    req.on('error', (e) => {
        console.error(e);
    });
    req.end();    
}

function printQueue(channelId) {
    var handQueue = [];
    handQueue = channelQueues[channelId];
    logger.info("Queue contains: " + handQueue + " \n");
}