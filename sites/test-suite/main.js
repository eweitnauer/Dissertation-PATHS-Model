var pixels_per_unit = 50
  , div, p;

function init() {
	div = d3.select('div#log');
	var ps = new PITestSuite(100, 2000);
	ps.addParameter('pres_mode',
		['interleaved-sim-sim', 'interleaved-sim-dis'
		,'interleaved-dis-sim', 'interleaved-dis-dis'
	  ,'blocked-sim-sim', 'blocked-sim-dis'
		,'blocked-dis-sim', 'blocked-dis-dis']);
	ps.setLogServer('http://localhost:3000', 'pi');
	ps.before_step_callback = show_step;
	ps.after_step_callback = show_res;
	ps.progress_callback = show_progress;
	ps.run();
}

function show_step(i, N, params) {
	pstr = params.map(function(param) {
    return param.name+'="'+param.value+'"';
  }).join(', ');

	p = div.append('p')
	  .html('step '+i+' of '+N+' with parameters '+ pstr + '<br/>')
	  .style('word-wrap', 'break-word');
}

function show_progress(solved, i, N) {
	p.append('span').text(solved ? '✓' : '✗').style('color', solved ? 'green' : 'red');
}

function show_res(params, stats) {
	p.html(p.html() + '<br/>  solved: ' + stats.solved + '/' + stats.runs
	       + '  steps: ' + Math.round(stats.steps.avg)
	       + ' +-' + Math.round(stats.steps.std_dev));
}
