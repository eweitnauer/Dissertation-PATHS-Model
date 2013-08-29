/** Testing
scenes = []; for (p in problems) scenes.push(problems[p].sn);
var t = new PITester(PI.v0_2_1, scenes, 1, 1000, 1, false);
t.run();
*/

/// Used to test how well a problem is solved by the passed physics interpreter.
PITester = function(pi, scenes, reps, max_steps, max_sols, log_level) {
	this.pi = pi;
	this.scenes = scenes;
	this.reps = reps || 1;
	this.max_steps = max_steps || 1000;
	this.max_sols = max_sols || 1;
	this.log_level = log_level || 0;
}

PITester.prototype.run = function() {
	var res = [];
	for (var i=0; i<this.reps; i++) {
		var curr_res = {i: i};
	  console.log('run',i+1,'of',this.reps);
	  this.clear_scenes();
	  var ws = new this.pi.Workspace(scenes, this.log_level);
	  for (var j=0; j<this.max_steps; j++) {
	    ws.coderack.step();
	    curr_res.steps = j+1;
	    if (ws.solutions.length >= this.max_sols) break;
	  }
	  curr_res.perception_count = ws.perception_count;
	  curr_res.retrieval_count = ws.retrieval_count;
	  curr_res.sols = ws.solutions;
	  curr_res.solved = ws.solutions.length > 0;
	  res.push(curr_res);
	}
	var sum=0;
	for (var i=0; i<res.length; i++) if (res[i].solved) sum++;
	console.log('solved', sum, 'of', res.length);

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
