// const http = require("http");
const fs = require("fs");
let port = process.env.PORT || 3002;
// const server = http.createServer();
const path = require("path"); // for express use
const express = require("express"); 
const app = express();
const https = require("http").createServer(app);
const {wordle_mp_handler} = require('./wordle_mp_handler.js');

const io = require('socket.io')(https);
wordle_mp_handler(io);

https.listen(port, (error) => {
	// if()
	if(error) console.log("error----")
	console.log("listening now at port:", port);
}).on('error', e => {
	if(e.errno == -48){
		port++;
		https.listen(port, (error) => {
			// if()
			if(error) console.log("error----")
			console.log("listening now at port:", port);
		});
	}
});
app.get('*', (req, res) => req_handler(req, res));

const htmlPages = {
	"/": "frontend/wordle_game.html"
};

function req_handler(req, res){
	let url = require('url');
	let url_parts = url.parse(req.url, true);

    if(req.url.split('?')[0] in htmlPages){
		// console.log("piping ",htmlPages[req.url])
		const page = fs.createReadStream(htmlPages[req.url.split('?')[0]]);
		res.writeHead(200, { "Content-Type":"text/html" });
		page.pipe(res);
		return;
    } else {
		let url = req.url.slice(1);
		// console.log(url);
		
		// /*!url.endsWith(".css") || !url.includes("static") &&  */ 
        if(!fs.existsSync(url)){
			// console.log(req.url, " ===requested	");
			res.writeHead(404, { "Content-Type": "text/html" });
			res.end("<h1> page not found </h1>");
			return;
		}
		const webpage = fs.createReadStream(url);
		webpage.pipe(res);
	}
	
}