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
	return d;
}

var cols = [ 'step_idx', 'step_count', ['pbp', 'params.0.value']
           , ['pres_mode', 'params.1.value'], 'stats.pi_version', 'stats.runs'
           , 'stats.solved', 'stats.steps.avg', 'stats.steps.std_dev'
           , 'stats.steps.min', 'stats.steps.max'
           //, 'stats.perception_count', 'stats.retrieval_count'
           //'stats.solutions'
           ];
function writeData(data) {
	stringifier = stringify();
	stringifier.pipe(process.stdout);//fs.createWriteStream('out.csv'));
  for (var i=0; i<data.length; i++) {
  	var row = cols.map(function(col) {
  		return JSON.stringify(getField(data[i], (typeof(col)==='string' ? col : col[1])));
  	});
  	stringifier.write(row);
  }
  stringifier.end();
}
