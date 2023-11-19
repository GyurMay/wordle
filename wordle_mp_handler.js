/** 
 * 
 * 'boiler plate' code if pre-existing server doesn't exist
const express = require("express"); 
const app = express();
const https = require("http").createServer(app);

const io = require('socket.io')(https);
https.listen(port, () => {
	console.log("listening now at port:", port);
  });    
const htmlPages = { '/':'/' }
app.get('*', (req, res) => {   
    if(req.url in htmlPages){
        const page = fs.createReadStream(htmlPages[req.url]);
		res.writeHead(200, { "Content-Type":"text/html" });
		page.pipe(res);
		return;
    }
});

**/

const game_users = [];

const wordle_mp_handler = (io) => {
    io.on('connection', (socket) => {
        console.log(socket.id, " connected");
        
        
		socket.on('usernameExistCheck', msg => {
           let {username, serverName, userId} = JSON.parse(msg);
           console.log(msg) 
           console.log(JSON.stringify(game_users, null, 2));
           let sv = game_users.find(x => x.serverName === serverName);
           console.log(sv, 'checking username', (sv ? console.log(game_users.find(x => x.serverName === serverName).stats) && game_users.find(x => x.serverName === serverName).stats.find(x => x.username === username): 'noserver'))
           socket.emit('usernameExist'+userId, (
                    (game_users.find(x => x.serverName === serverName) === undefined) || 
                    (game_users.find(x => x.serverName === serverName).stats.find(x => x.username === username) === undefined)
                )
            );
        });

        socket.on('dbRequest', () => {
            io.emit('dbRequestClient',  JSON.stringify(game_users.find((x) => x.serverName === serverName)))
        });
        // socket.on('checkIfValid', data => {
        //     const {serverName, username, socketId} = JSON.parse(data);
        //     let serverObj = game_users.find(x => x.serverName === serverName);
        //     if(!(serverObj && serverObj.stats.find(x => x.username === username))){
        //         io.emit('error'+socketId, 'Error occured! rejoin the game if it exists');
        //         return;
        //     }
        //     // let userObj = serverObj.stats.find(x => x.username === username);
        // })
        socket.on('attempt guess', message => {
            console.log(message)
            message = JSON.parse(message);
            // let un = game_users[socket.id] ? game_users[socket.id] : socket.id;
            let msg = message.guess;
            // let username = message.username;
            // let serverName = message.serverName;
            // let userId = message.userId; // used for error emit only

            let {username, serverName, userId} = message;

            let serverObj = game_users.find(x => x.serverName === serverName);

            //check if users got kicked out or are joining a dead server/game
            if(!(serverObj && serverObj.stats.find(x => x.username === username))){
                console.log('error'+userId,'sending alert...')
                io.emit('error'+userId, 'your not in the game! rejoin the game if it exists');
                return;
            }

            let userObj = serverObj.stats.find(x => x.username === username);

            console.log(JSON.stringify(game_users, null, 2))
            let userTries = userObj.tries;
            userTries.push(msg);
            // console.log(JSON.stringify(game_users));
            io.emit('attempt guess', msg);
            // console.log('varkhar',game_users[serverName])
            // let serverLength = Object.keys(serverObj.stats).length;
            let serverLength = serverObj.stats.length;
            if(serverLength <= 1) return;
            // console.log('sent to:','opponentUpdate'+socket.id);
            let currServer = game_users.find(x => x.serverName === serverName);
            let opponentStats = currServer.stats.filter(x => x.username !== username);

            opponentStats.forEach(x => {
                io.emit('opponentUpdate' + x.id
                , JSON.stringify({triesLeft: (5 - userTries.length), msg: `${username} guessed ${msg}`}));
            })
        });

        socket.on('setAnswer', obj => {
            const {serverName, answer_word} = JSON.parse(obj);
            // console.log(JSON.parse(obj))
            let currServer = game_users.find((x) => x.serverName === serverName);
            currServer.stats[0]['answer_word'] = answer_word;
            // console.log(currServer.stats, "--------------")
        });

        // setUsername is synonymous to addUser. 
        socket.on('setUsername', obj => {
            const {username, serverName, userId} = JSON.parse(obj);
            //if the game doesn't exist create new one
            let serverFound = game_users.find(x => x.serverName === serverName);
            if(serverFound === undefined){
                game_users.push({
                    serverName: serverName,
                    stats: [{id: userId, socketId: socket.id, username, tries:[]}]
                })
            }else{ //if the game already exists, find the object with the serverName and push on the 'stats' property

                let stats = {id: userId, socketId: socket.id, username, tries:[]};

                serverFound.stats.push(stats);
                users = [];
                serverFound.stats.forEach(x => users.push(x.username))
                io.emit('lobbyList', users.join(', '));
                io.emit('setAnswerClient', serverFound.stats[0].answer_word)
            }	
            // console.log(JSON.stringify(game_users, null, 2));
            io.emit('usernameSet', 'saved')
        });
        socket.on('gameWon', obj => {
            const {username, serverName} = JSON.parse(obj);
            // console.log(`the game has finished for ${serverName}, sending:: gameOver${serverName}`)
            io.emit('gameOver'+serverName, username);
        })

        socket.on('disconnect', () => {

            let theServer = game_users.find(x => x.stats.find(y => y.socketId === (socket.id)));
            if(theServer === undefined){
                return
            }
            let theUserInx = theServer.stats.findIndex(x => x.socketId.includes(socket.id));
            // console.log(socket.id, 
            //     console.log(JSON.stringify(theServer, null, 2)),'\n',
            //             theServer.stats[theUserInx].username, 'disconnected')
            let remainingUsers = theServer.stats.filter(x => x.socketId !== socket.id);
            remainingUsers.forEach(x => {
                io.emit('error'+x.id, `${theServer.stats[theUserInx].username} has left the game`);
            })
            theServer.stats.splice(theUserInx,1);
        })
    });


}

module.exports = {wordle_mp_handler};