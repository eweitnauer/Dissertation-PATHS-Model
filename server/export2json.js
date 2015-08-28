/// This is not required anymore due to our new, flat document structure.
/// Instead, use
/// `mongoexport --host localhost --db data-server --collection pi -f test_id,step_idx,step_count,pbp,pres_mode,rep,reps,solved,steps,perception_count,retrieval_count,sol,timestamp --csv`
/// However, mongoexport does not support column names with spaces or dashes, so we need this script after all.
var db = require('./db');
var stringify = require('csv-stringify');
var fs = require('fs');
db.connect(on_connect);

if (process.argv.length < 3) {
  console.log('please pass the mongodb collection name as parameter');
  process.exit(1);
}

var coll_name = process.argv[2];

function on_connect() {
	var data = db.findAll(coll_name, {sort: 'trial_curr'}, writeData);
}

function getField(d, path) {
  var keys = path.split('.');
	while (keys.length) d = d[keys.shift()];
  if (path === 'solved') return d ? 1 : 0;
  return d;
}

var cols_csv = [ 'test_id', 'trial_curr', 'trial_total', 'rep'
           , 'reps', 'feature_prior_strength'
           , 'steps', 'steps_max', 'pbp', 'pres_mode', 'perception_count'
           , 'retrieval_count', 'sol', 'solved', 'timestamp' ];

var cols_db = [ 'test_id', 'trial_curr', 'trial_total', 'rep'
           , 'reps', 'activity->feature->hyp_base'
           , 'steps', 'steps_max', 'pbp', 'pres_mode', 'perception_count'
           , 'retrieval_count', 'sol', 'solved', 'timestamp' ];

function writeData(data) {
  db.close();
  stringifier = stringify();
	stringifier.pipe(process.stdout);//fs.createWriteStream('out.csv'));
  writeHeader(stringifier);
  for (var i=0; i<data.length; i++) {
    var row = cols_db.map(function(key) {
      var res = data[i][key];
      if (key === 'solved') return res ? 1 : 0;
      // if (key === 'rep') return res+75;
      // if (key === 'reps') return 4*res;
      return res;
      // return getField(data[i], key);
  	});
  	stringifier.write(row);
  }
  stringifier.end();
}
function writeHeader(stringifier) {
  stringifier.write(cols_csv);
}