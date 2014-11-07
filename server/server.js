var db = require('./db.js')
var express = require('express')
var bodyParser = require('body-parser')
var name_validator = /^[a-zA-Z0-9_]+$/;
var app = express()

/** Allow other sites to use this server */
function allowCrossDomain(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
}

app.use(allowCrossDomain);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function (req, res) {
  res.send('Hello World!')
})

app.post('/:db', function (req, res) {
	if (!req.params.db.match(name_validator)) {
		console.log('unsupported collection name:', req.params.db);
		res.send('fail');
		return;
	}
	console.log('inserting', req.body, 'into the collection', req.params.db+'...');
	db.insert(req.params.db, req.body, function(err, result) {
	  res.send(err ? 'fail' : 'success');
  });
})

db.connect(on_connect);

function on_connect() {
	var server = app.listen(3000, function () {
  	var host = server.address().address
  	var port = server.address().port
  	console.log('Data logging server listening at http://%s:%s', host, port)
  	console.log('Post data to http://%s:%s/<coll_name>', host, port);
  	console.log('e.g., try: curl -d \'[{"a":1},{"a":2}]\' -H \'content-type:application/json\' %s:%s/pi', host, port);
	})
}
