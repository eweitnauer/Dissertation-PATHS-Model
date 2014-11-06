var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');

// Connection URL
var url = 'mongodb://localhost:27017/data-server';
var db = null;

var connect = function(callback) {
	// Use connect method to connect to the Server
	MongoClient.connect(url, function(err, _db) {
		db = _db;
	  assert.equal(null, err);
	  console.log("database connection setup correctly");
	  callback();
	});
}

var insertDocuments = function(coll_name, data, callback) {
	if (!Array.isArray(data)) data = [data];
	var now = new Date();
	data.forEach(function(d) { d.timestamp = d.timestamp || now });
  // Get the documents collection
  var collection = db.collection(coll_name);
  // Insert some documents
  collection.insert(data, function(err, result) {
    assert.equal(err, null);
    assert.equal(data.length, result.result.n);
    assert.equal(data.length, result.ops.length);
    console.log("Inserted", data.length, "documents into the document collection");
    callback(err, result);
  });
}

var closeDB = function() {
 	db.close();
}

exports.insert = insertDocuments;
exports.close = closeDB;
exports.connect = connect;
