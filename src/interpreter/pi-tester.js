/** Testing
scenes = []; for (p in problems) scenes.push(problems[p].sn);
var t = new PITester(PI.v0_2_1, scenes, 1, 1000, 1, false);
t.run();
*/

/// Used to test how well a problem is solved by the passed physics interpreter. You
/// can pass 'current' as pi and the tester will pick the newest pi from the PI object,
/// automatically.
/// Set the before_step_callback, after_step_callback, start_callback, finish_callback can all
/// be set to functions.
PITester = function(pi, scenes, reps, max_steps, max_sols, log_level) {
	this.pi = (pi=='current' ? PITester.get_current_pi()() : pi);
	this.scenes = scenes;
	this.reps = reps || 1;
	this.curr_rep = 0;
	this.curr_step = 0;
	this.res = [];
	this.ws = null;
	this.max_steps = max_steps || 1000;
	this.max_sols = max_sols || 1;
	this.log_level = log_level || 0;
	this.after_step_callback = null;
	this.after_rep_callback = null;
	this.before_step_callback = null;
	this.start_callback = null;
	this.finish_callback = null;
	this.auto_next = false;
	this.auto_next_delay = 0;
	this.next_timer = null;
	this.initNextRep();
}

PITester.prototype.reset = function() {
	this.res = [];
	this.curr_rep = 0;
	this.curr_step = 0;
	this.ws = null;
	this.initNextRep();
}

PITester.prototype.initNextRep = function() {
	this.curr_rep++;
	this.curr_step = 0;
	this.clear_scenes();
	this.ws = this.pi.createWorkspace(this.scenes, this.log_level);
	if (this.logCallback) this.ws.logCallback = this.logCallback;
	if (this.start_callback) this.start_callback();
	console.log('run',this.curr_rep,'of',this.reps);
}

PITester.prototype.run = function() {
	this.auto_next = true;
	this.step();
}

PITester.prototype.pause = function() {
	if (this.next_timer) clearTimeout(this.next_timer);
	this.auto_next = false;
}

PITester.prototype.isRepFinished = function() {
	return (this.curr_step === this.max_steps
	       || this.ws.solutions.length >= this.max_sols);
}

PITester.prototype.step = function() {
	if (!this.ws || this.isRepFinished()) this.initNextRep();

	// do a step
	if (this.before_step_callback) this.before_step_callback(this.curr_step, this.max_steps);
	this.ws.coderack.step();
	this.curr_step++;
	if (this.after_step_callback) this.after_step_callback(this.curr_step, this.max_steps);

	// are we done with the current repetition?
	if (this.isRepFinished()) {
		// save current result
		var curr_res = {rep: this.curr_rep, steps: this.curr_step-1};
	  curr_res.perception_count = this.ws.perception_count;
	  curr_res.retrieval_count = this.ws.retrieval_count;
	  curr_res.sols = this.ws.solutions;
	  if (this.max_sols === 1) curr_res.sol = this.ws.solutions[0];
	  curr_res.solved = this.ws.solutions.length > 0;
	  curr_res.reps = this.reps;
	  this.res.push(curr_res);
	  if (this.after_rep_callback) this.after_rep_callback(curr_res.solved, this.curr_rep, this.reps);
	  // are we finished?
	  if (this.curr_rep === this.reps) {
	  	if (this.finish_callback) this.finish_callback();
	  	return this.show_stats();
	  }
	}
	// next step
	if (this.auto_next) this.next_timer = setTimeout(this.step.bind(this, true), this.auto_next_delay);
}

PITester.prototype.setLogCallback = function(cb) {
	this.logCallback = cb;
	if (this.ws) this.ws.logCallback = this.logCallback;
}

PITester.prototype.get_stats = function() {
	var stats = { };
	var res = this.res;
	stats.pi_version = this.pi.version;
	stats.runs = res.length;
	stats.solved = res.filter(function(r) { return r.solved }).length;
	stats.solutions = [];
	for (var i=0; i<res.length; i++) {
		var sol = res[i].sols[0];
		if (!sol) continue;
		var sol_descr = sol.describe();
		var same_sol = stats.solutions.filter(function(sinfo) {
		  return sinfo.sol === sol_descr
		})[0];
		if (same_sol) same_sol.count++;
		else stats.solutions.push({sol: sol_descr, count: 1});
	}

	var calc_stat = function(name) {
		var stat = {name: name};
		var ext = d3.extent(res, function(d) {return d[name]});
		var avg = d3.mean(res, function(d) {return d[name]});
		var avg_square = 0;
		for (var j=0; j<res.length; j++) {
			avg_square += res[j][name] * res[j][name];
		}
		avg_square /= res.length;
		var std_dev = Math.sqrt(avg_square - avg*avg);
		stat.min = ext[0]; stat.max = ext[1];
		stat.avg = avg; stat.std_dev = std_dev;
		return stat;
	}

	stats.trials = this.res;
	stats.steps = calc_stat('steps');
	stats.perception_count = calc_stat('perception_count');
	stats.retrieval_count = calc_stat('retrieval_count');

	return stats;
}

PITester.prototype.show_stats = function() {
	var stats = this.get_stats();
	console.log('PI v'+stats.pi_version, 'solved', stats.solved, 'of', stats.runs);
	for (var key in stats) {
		if (!stats[key].std_dev) continue;
		var s = stats[key];
		console.log( key + ':', s.avg.toFixed(0), '+-' + s.std_dev.toFixed(1)
			         , 'min=' + s.min, 'max=' + s.max );
	}
	// var sum=0;
	// for (var i=0; i<res.length; i++) if (res[i].solved) sum++;
	// console.log('PI v'+this.pi.version, 'solved', sum, 'of', res.length);

	// var stats = function(/*args*/) {
	// 	for (var i=0; i<arguments.length; i++) {
	// 	 	var name = arguments[i];
	// 		var ext = d3.extent(res, function(d) {return d[name]});
	// 		var avg = d3.mean(res, function(d) {return d[name]});
	// 		var avg_square = 0;
	// 		for (var j=0; j<res.length; j++) {
	// 			avg_square += res[j][name] * res[j][name];
	// 		}
	// 		avg_square /= res.length;
	// 		var std_dev = Math.sqrt(avg_square - avg*avg);
	// 		console.log(name + ': ' + avg.toFixed(0) + ' +-' + std_dev.toFixed(1)
	// 		          + ' min=' + ext[0] + ' max=' + ext[1]);
	// 	}
	// }
	// stats('steps', 'perception_count', 'retrieval_count');
	// return res;
}

PITester.prototype.clear_scenes = function() {
	this.scenes.forEach(function (s) {
		s.groups = [];
		s.objs.forEach(function (o) {
			o.times.start = {};
			o.times.end = {};
			o.selectors = [];
		});
	});
}

PITester.get_current_pi = function() {
	var curr = d3.keys(PI).reduce(function(a,b) { return a>b ? a : b});
	return PI[curr];
}

/// Pass the html table element and the tester will use d3 to
/// bind & update it with the selector data from the current pi.
PITester.prototype.updateHypothesisTable = function(table_el, clickCallback) {
	var selectors = this.ws ? this.ws.getHypothesisInfoArray() : [];

	var trs = d3.select(table_el)
	  .selectAll('tr')
	  .data(selectors)
	  .sort(function(a, b) { return b.val-a.val });

	var side_str = { 'both': 'LR', 'left': 'L', 'right': 'R', 'fail': '--'};
	var mode_str = { 'all': 'A', 'exists': 'E', 'unique': '1'};

	trs.enter().append('tr');
	trs.exit().remove();
	var tds = trs
		.on('click', function(info) {	clickCallback(info.src) })
		.style('color', function(d) { return d.val === 0 ? 'silver' : 'black' })
	  .selectAll('td')
	  .data(function(d) { return [ side_str[d.src.main_side]
	  	                         , mode_str[d.src.mode]
	  	                         , d.src.sel.describe()
	  	                         //, d.src.sel.getComplexity()
	  	                         , (d.src.matches.left + d.src.matches.right) / (d.src.main_side === 'both' ? 2 : 1)
	  	                         , d.val.toFixed(2)] })

	tds.enter().append('td');
	tds.exit().remove();
	tds.text(function(d) { return d });
}

PITester.prototype.updateFeatureList = function(div_el, click_callback) {
	var features = this.ws ? this.ws.getFeatureInfoArray() : [];

	var divs = d3.select(div_el)
	  .selectAll('.feature')
	  .data(features);

	var enter = divs.enter()
		.append('div')
	    .classed('feature', true)
	if (click_callback) enter.on('click', function(d) { click_callback(d.src) });
	enter.append('div')
		.classed('key', true)
	  .text(function(d) { return d.key.split('_').join(' ') });
	enter.append('div')
	  .classed('val', true);

	// divs.style('background-color', function(d) { return 'rgba(0,0,0,'+d.val/2+')' });
	divs.style('opacity', function(d) { return 0.8*d.val+0.2 });
	divs.select('.val').text(function(d) { return d.val.toFixed(2) });

	divs.exit().remove();
}

PITester.prototype.updateCodeletStats = function(div_el) {
	var stats = this.ws ? d3.values(this.ws.coderack.cdl_stats) : [];
	var behavior = this.ws.coderack.behaviors[0];

	var ps = d3.select(div_el)
	  .selectAll('.stat')
	  .data(stats);

	var enter = ps.enter().append('p').classed('stat', true);
	ps.text(function(d) { return d.name + ': ' + d.success + ' ; ' + d.failure
	                           + ' ['
	                           + behavior.getBottomUpAttention(d.name).toFixed(2) + '*'
	                           + behavior.getTopDownAttention(d.name).toFixed(2) + ' = '
	                           + behavior.getCombinedAttention(d.name).toFixed(2) + ']' });
	ps.exit().remove();
}

PITester.prototype.getActiveScenes = function() {
	return this.ws ? this.ws.getActiveScenePair() : [];
}

PITester.prototype.updateSolutionList = function(list_el) {
	var solutions = this.ws ? this.ws.solutions : [];

	var divs = d3.select(list_el)
	  .selectAll('.solutions')
	  .data(solutions);

	divs.enter()
	  .append('li')
	  .text(function(d) { return d.describe() });

	divs.exit().remove();
}
