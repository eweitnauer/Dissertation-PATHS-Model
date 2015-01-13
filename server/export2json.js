/// This is not required anymore due to our new, flat document structure.
/// Instead, use
/// `mongoexport --host localhost --db data-server --collection pi -f test_id,step_idx,step_count,pbp,pres_mode,rep,reps,solved,steps,perception_count,retrieval_count,sol,timestamp --csv`
var db = require('./db');
var stringify = require('csv-stringify');
var fs = require('fs');
db.connect(on_connect);

function on_connect() {
	var data = db.findAll('pi', {sort: 'step_idx'}, writeData);
}

function getField(d, path) {
  var keys = path.split('.');
	while (keys.length) d = d[keys.shift()];
  if (path === 'solved') return d ? 1 : 0;
  return d;
}

var cols = [ 'test_id', 'step_idx', 'step_count', 'pbp'
           , 'pres_mode', ['feature1st', 'perception->pick_feature_fist']
           , 'rep', 'reps', 'solved', 'steps', 'perception_count'
           , 'retrieval_count', 'sol', 'timestamp' ];
function writeData(data) {
  db.close();
  stringifier = stringify();
	stringifier.pipe(process.stdout);//fs.createWriteStream('out.csv'));
  writeHeader(stringifier);
  for (var i=0; i<data.length; i++) {
    var row = cols.map(function(col) {
  		return getField(data[i], (typeof(col)==='string' ? col : col[1]));
  	});
  	stringifier.write(row);
  }
  stringifier.end();
}
function writeHeader(stringifier) {
  var row = cols.map(function(col) { return typeof(col) === 'string' ? col : col[0]});
  stringifier.write(row);
}