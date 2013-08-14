/** Testing
scenes = []; for (p in problems) scenes.push(problems[p].sn);
var t = new PITester(PI.v_0_1_1, scenes);
t.run();
*/

/// Used to test how well a problem is solved by the passed physics interpreter.
PITester = function(pi, scenes, reps, max_steps, max_sols, debug) {
	this.pi = pi;
	this.scenes = scenes;
	this.reps = reps || 1;
	this.max_steps = max_steps || 1000;
	this.max_sols = max_sols || 1;
	this.debug = debug;
}

PITester.prototype.run = function() {
	var res = [];
	for (var i=0; i<this.reps; i++) {
		var curr_res = {i: i};
	  console.log('run',i+1,'of',this.reps);
	  this.clear_scenes();
	  var ws = new this.pi.Workspace(scenes, this.debug);
	  for (var j=0; j<this.max_steps; j++) {
	    ws.coderack.step();
	    curr_res.steps = j+1;
	    if (ws.solutions.length >= this.max_sols) break;
	  }
	  curr_res.sols = ws.solutions;
	  curr_res.solved = ws.solutions.length > 0;
	  res.push(curr_res);
	}
	var sum=0;
	for (var i=0; i<res.length; i++) if (res[i].solved) sum++;
	console.log('solved', sum, 'of', res.length);
	var ext = d3.extent(res, function(d) {return d.steps});
	var avg = d3.mean(res, function(d) {return d.steps});
	console.log('used',avg,'steps in average, min='+ext[0], 'max='+ext[1]);
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
