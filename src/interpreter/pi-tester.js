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
	this.pi = (pi=='current' ? this.get_current_pi() : pi);
	this.scenes = scenes;
	this.reps = reps || 1;
	this.max_steps = max_steps || 1000;
	this.max_sols = max_sols || 1;
	this.log_level = log_level || 0;
	this.after_step_callback = null;
	this.before_step_callback = null;
	this.start_callback = null;
	this.finish_callback = null;
}

PITester.prototype.run = function() {
	this.res = [];
	this.curr_rep = 1;
	this.ws = null;
	this.step(true);
}

PITester.prototype.step = function(auto_next) {
	if (!this.ws) { // setup new repetition
		this.curr_step = 1;
		if (this.start_callback) this.start_callback();
		this.clear_scenes();
		this.ws = new this.pi.Workspace(this.scenes, this.log_level);
		console.log('run',this.curr_rep,'of',this.reps);
	}

	// do a step
	if (this.before_step_callback) this.before_step_callback(this.curr_step);
	this.ws.coderack.step();
	if (this.after_step_callback) this.after_step_callback(this.curr_step);
	this.curr_step++;

	// are we done with the current repetition?
	if (this.curr_step > this.max_steps || this.ws.solutions.length >= this.max_sols) {
		// save current result
		var curr_res = {rep: this.curr_rep, steps: this.curr_step-1};
	  curr_res.perception_count = this.ws.perception_count;
	  curr_res.retrieval_count = this.ws.retrieval_count;
	  curr_res.sols = this.ws.solutions;
	  curr_res.solved = this.ws.solutions.length > 0;
	  this.res.push(curr_res);
	  this.curr_rep++;
	  this.ws = null;
	  // are we finished?
	  if (this.curr_rep > this.reps) {
	  	if (this.finish_callback) this.finish_callback();
	  	return this.show_stats(this.res);
	  }
	}
	// next step
	if (auto_next) setTimeout(this.step.bind(this, true), 0);
}

PITester.prototype.show_stats = function(res) {
	var sum=0;
	for (var i=0; i<res.length; i++) if (res[i].solved) sum++;
	console.log('PI v'+this.pi.version, 'solved', sum, 'of', res.length);

	var stats = function(/*args*/) {
		for (var i=0; i<arguments.length; i++) {
		 	var name = arguments[i];
			var ext = d3.extent(res, function(d) {return d[name]});
			var avg = d3.mean(res, function(d) {return d[name]});
			console.log(name + ': avg=' + avg + ' min=' + ext[0] + ' max=' + ext[1]);
		}
	}
	stats('steps', 'perception_count', 'retrieval_count');
	return res;
}

PITester.prototype.clear_scenes = function() {
	this.scenes.forEach(function (s) {
		s.groups = [];
		s.objs.forEach(function (o) {
			o.times.start = {};
			o.times.end = {};
		});
	});
}

PITester.prototype.get_current_pi = function() {
	var curr = d3.keys(PI).reduce(function(a,b) { return a>b ? a : b});
	return PI[curr];
}