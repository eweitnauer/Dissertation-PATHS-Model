var pixels_per_unit = 50
  , div, p;

function init(idx) {
	console.log('initializing...');
	div = d3.select('div#log');
	var ps = new PITestSuite(100, 2500);
	ps.addParameter('pres_mode',
		['interleaved-sim-sim', 'interleaved-sim-dis'
		,'interleaved-dis-sim', 'interleaved-dis-dis'
	  ,'blocked-sim-sim', 'blocked-sim-dis'
		,'blocked-dis-sim', 'blocked-dis-dis']);
	ps.setLogServer('http://localhost:3000', 'pi');
	ps.before_step_callback = show_step;
	ps.after_step_callback = show_res;
	ps.progress_callback = show_progress;
	ps.log_error_callback = log_error;
	ps.run(idx || 0);
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
	console.log(solved ? 'OK' : 'FAIL');
	p.append('span').text(solved ? '✓' : '✗').style('color', solved ? 'green' : 'red');
}

function show_res(params, stats) {
	console.log('solved: ' + stats.solved + '/' + stats.runs);
	p.html(p.html() + '<br/>  solved: ' + stats.solved + '/' + stats.runs
	       + '  steps: ' + Math.round(stats.steps.avg)
	       + ' +-' + Math.round(stats.steps.std_dev));
}
