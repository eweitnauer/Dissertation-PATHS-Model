var pixels_per_unit = 50
  , div, p, t;

function init(idx) {
	var ps = setup_testsuite();
	ps.addParameter('pres_mode',
		['interleaved-sim-sim', 'interleaved-sim-dis'
		,'interleaved-dis-sim', 'interleaved-dis-dis'
	  ,'blocked-sim-sim', 'blocked-sim-dis'
		,'blocked-dis-sim', 'blocked-dis-dis']);
	ps.run(idx || 0);
}

function init_ff(idx) {
	var ps = setup_testsuite();
	ps.setParameter('pbp', ['pbp13']);
	ps.addParameter('perception.pick_feature_first', [0, 0.5, 1]);
	ps.run(idx || 0);
}

function setup_testsuite() {
	console.log('initializing...');
	div = d3.select('div#log');
	var ps = new PITestSuite(100, 2500);
	ps.setLogServer('http://localhost:3000', 'pi');
	ps.before_step_callback = show_step;
	ps.after_step_callback = show_res;
	ps.progress_callback = show_progress;
	ps.log_error_callback = log_error;
	t = Date.now();
	return ps;
}

function log_error(error) {
	console.log('LOGGING ERROR!');
	div.append('p')
	  .text('LOGGING ERROR!')
	  .style({'font-size': '25px', 'color': 'red', 'font-weight': 'bold'})
}

function show_step(i, N, params) {
	pstr = params.map(function(param) {
    return param.name+'="'+param.value+'"';
  }).join(', ');

	console.log('step '+i+' of '+N+' with parameters '+ pstr);
	p = div.append('p')
	  .html('step '+i+' of '+N+' with parameters '+ pstr + '<br/>')
	  .style('word-wrap', 'break-word');
}

function show_progress(solved, i, N) {
	console.log((solved ? 'OK' : 'FAIL') + ' in ' + ((Date.now()-t)/1000).toFixed(1) + ' sec');
	t = Date.now();
	p.append('span').text(solved ? '✓' : '✗').style('color', solved ? 'green' : 'red');
}

function show_res(params, stats) {
	console.log('solved: ' + stats.solved + '/' + stats.runs);
	p.html(p.html() + '<br/>  solved: ' + stats.solved + '/' + stats.runs
	       + '  steps: ' + Math.round(stats.steps.avg)
	       + ' +-' + Math.round(stats.steps.std_dev));
}
