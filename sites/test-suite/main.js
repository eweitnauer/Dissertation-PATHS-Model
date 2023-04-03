console.log('Hi!');
var pixels_per_unit = 50
  , div, p, t;

function init(from, to, db_suffix) {
	var ps = setup_testsuite(25, 2500, db_suffix);
	ps.setParameter('pbp', ['pbp13', 'pbp26', 'pbp31']);
	ps.addParameter('pres_mode',
		['interleaved-sim-sim', 'interleaved-sim-dis'
		,'interleaved-dis-sim', 'interleaved-dis-dis'
	  ,'blocked-sim-sim', 'blocked-sim-dis'
		,'blocked-dis-sim', 'blocked-dis-dis']);
	ps.addParameter('activity.feature.hyp_base', [100]);
	ps.addParameter('activity.obj.hyp_base', [0.1, 100]);
	ps.run(0, to || Infinity);
}

function initLesion(from, to, db_suffix) {
	var ps = setup_testsuite(25, 2500, db_suffix);
	ps.addParameter('pres_mode',
		['interleaved-sim-sim', 'interleaved-sim-dis'
		,'interleaved-dis-sim', 'interleaved-dis-dis'
	  ,'blocked-sim-sim', 'blocked-sim-dis'
		,'blocked-dis-sim', 'blocked-dis-dis']);
	ps.addParameter('activity.selector.hyp_base', [0.1, 10]);
	ps.run(0, to || Infinity);
}

window.initNoPhysics = function initNoPhysics(from, to, db_suffix) {
	var ps = setup_testsuite(5, 2500, db_suffix);
	ps.addParameter('pres_mode',
		['interleaved-sim-sim', 'interleaved-sim-dis'
		,'interleaved-dis-sim', 'interleaved-dis-dis'
	  ,'blocked-sim-sim', 'blocked-sim-dis'
		,'blocked-dis-sim', 'blocked-dis-dis']);
	ps.addParameter('activity.time', [{ start: 1, end: 0 }]);
	ps.run(from || 0, to || Infinity, feature_list.filter(function(feature) { return feature.group !== 'dynamics' }));
}

function initNew18(from, to, db_suffix) {
	var ps = setup_testsuite(100, 2500, db_suffix);
	ps.setParameter('pbp', ['pbp18sim', 'pbp18dis']);
	ps.addParameter('pres_mode', ['interleaved-sim-sim', 'blocked-sim-sim']);
	ps.addParameter('randomize_row_order', [true]);
	ps.run(from, to || Infinity);
}

function init_fullblocked(from, to, db_suffix) {
	var ps = setup_testsuite(25, 2500, db_suffix);
	ps.addParameter('pres_mode',
		['fullblocked-sim-sim', 'fullblocked-sim-dis'
		,'fullblocked-dis-sim', 'fullblocked-dis-dis']);
	ps.run(from || 0, to || Infinity);
}

var low = 0.1, mid = 0.2, high = 0.3;
var feature_list =
[
    { klass: CircleAttribute,      initial_activation: high,  group: 'shape' }
  , { klass: RightRelationship,    initial_activation: low,  group: 'hor-pos' }
  , { klass: LeftRelationship,     initial_activation: low,  group: 'hor-pos' }
  , { klass: TouchAttribute,       initial_activation: low,  group: 'distance' }
  , { klass: SquareAttribute,      initial_activation: high,  group: 'shape' }
  , { klass: FarRelationship,      initial_activation: low,  group: 'distance' }
  , { klass: TriangleAttribute,    initial_activation: high,  group: 'shape' }
  , { klass: CloseRelationship,    initial_activation: low,  group: 'distance' }
  , { klass: RectangleAttribute,   initial_activation: high,  group: 'shape' }
  , { klass: TouchRelationship,    initial_activation: low, group: 'distance' }
  , { klass: SmallAttribute,       initial_activation: high,  group: 'shape' }
  , { klass: HitsRelationship,     initial_activation: low,  group: 'dynamics' }
  , { klass: MovesAttribute,       initial_activation: mid, group: 'dynamics' }
  , { klass: GetsHitRelationship,  initial_activation: low,  group: 'dynamics' }
  , { klass: FarAttribute,         initial_activation: low,  group: 'distance' }
  , { klass: CollidesRelationship, initial_activation: low,  group: 'dynamics' }
  , { klass: AboveRelationship,    initial_activation: low,  group: 'vert-pos' }
  , { klass: CountAttribute,       initial_activation: low,  group: 'shape' }
  , { klass: BelowRelationship,    initial_activation: low,  group: 'vert-pos' }
  , { klass: CloseAttribute,       initial_activation: low,  group: 'distance' }
  , { klass: TopMostAttribute,     initial_activation: low,  group: 'vert-pos' }
  , { klass: LargeAttribute,       initial_activation: high,  group: 'shape' }
  , { klass: OnTopRelationship,    initial_activation: low,  group: 'vert-pos' }
  , { klass: OnGroundAttribute,    initial_activation: low,  group: 'vert-pos' }
  , { klass: BesideRelationship,   initial_activation: low,  group: 'hor-pos' }
  , { klass: BottomAttribute,      initial_activation: low,  group: 'vert-pos' }
  , { klass: TopAttribute,         initial_activation: low,  group: 'vert-pos' }
  , { klass: SupportsRelationship, initial_activation: low,  group: 'dynamics' }
  , { klass: LeftAttribute,        initial_activation: low,  group: 'hor-pos' }
  , { klass: RightAttribute,       initial_activation: low,  group: 'hor-pos' }
  , { klass: UnstableAttribute,    initial_activation: mid, group: 'dynamics' }
  , { klass: StableAttribute,      initial_activation: mid, group: 'dynamics' }
  , { klass: MovableUpAttribute,   initial_activation: low,  group: 'dynamics' }
  , { klass: SingleAttribute,      initial_activation: low, group: 'distance' }
];

function init_O(from, to, db_suffix) {
	var ps = setup_testsuite(25, 2500, db_suffix);
	ps.addParameter('feature_count', [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]);
	ps.addParameter('pbp', ['pbp26']);
	ps.run(from || 0, to || Infinity, feature_list);
}

function init_ff(idx) {
	var ps = setup_testsuite(75, 2000);
	//ps.setParameter('pbp', ['pbp13']);
	ps.addParameter('pres_mode',
		['interleaved-sim-sim', 'interleaved-sim-dis'
		,'interleaved-dis-sim', 'interleaved-dis-dis'
	    ,'blocked-sim-sim', 'blocked-sim-dis'
		,'blocked-dis-sim', 'blocked-dis-dis']);
	ps.addParameter('perception.pick_feature_fist', [0, 0.5, 1]);
	ps.run(idx || 0);
}

function setup_testsuite(reps, max_steps, db_suffix) {
	console.log('initializing...');
	div = d3.select('div#log');
	var ps = new PITestSuite(reps, max_steps);
	ps.setLogServer('http://localhost:3000', 'pi_'+pi_version.replace(/\./g, '_')+(db_suffix||''));
	//ps.before_step_callback = show_step;
	//ps.after_step_callback = show_res;
	ps.progress_callback = show_progress;
	ps.log_error_callback = log_error;
	t = Date.now();
	return ps;
}

function log_error(error) {
	console.log('LOGGING ERROR!', error);
	// div.append('p')
	//   .text('LOGGING ERROR!')
	//   .style({'font-size': '25px', 'color': 'red', 'font-weight': 'bold'})
}

function show_step(i, N, params) {
	pstr = params.map(function(param) {
    return param.name+'="'+param.value+'"';
  }).join(', ');

	console.log('step '+i+' of '+N+' with parameters '+ pstr);
	// p = div.append('p')
	//   .html('step '+i+' of '+N+' with parameters '+ pstr + '<br/>')
	//   .style('word-wrap', 'break-word');
}

function show_progress(solved, i, N) {
	console.log((solved ? 'OK' : 'FAIL') + ' in ' + ((Date.now()-t)/1000).toFixed(1) + ' sec');
	t = Date.now();
	//p.append('span').text(solved ? '✓' : '✗').style('color', solved ? 'green' : 'red');
}

function show_res(params, stats) {
	console.log('solved: ' + stats.solved + '/' + stats.runs);
	//p.html(p.html() + '<br/>  solved: ' + stats.solved + '/' + stats.runs
	//       + '  steps: ' + Math.round(stats.steps.avg)
	//       + ' +-' + Math.round(stats.steps.std_dev));
}
