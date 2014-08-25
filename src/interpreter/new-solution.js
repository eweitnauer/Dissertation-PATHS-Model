// Copyright 2014, Erik Weitnauer.

/// Holds an array of selectors.
/// Can be in one of 3 different modes: 'unique', 'exists', 'all'
/// (the default is 'exists').
/// main_side is either 'left' or 'right' (default: 'left').
/// selectors is a single selector or an array of selectors
Solution = function(selectors, main_side, mode) {
	this.sels = (Array.isArray(selectors) ? selectors.slice()
	                                      : (selectors ? [selectors] : []));
	this.mode = mode;
	this.setMainSide(main_side);
}

Solution.prototype.setMainSide = function (main_side) {
	this.main_side = main_side || 'left';
	this.other_side = {left: 'right', right: 'left'}[this.main_side];
  return this;
}

Solution.prototype.check = function(scenes_l, scenes_r) {
	var main_scenes  = this.main_side == 'left'  ? scenes_l : scenes_r
	   ,other_scenes = this.main_side == 'right' ? scenes_l : scenes_r;

	return (main_scenes.every(this.check_scene.bind(this))
		     && !other_scenes.some(this.check_scene.bind(this)));
}

/// Applies all selectors consecutively to the scene and checks
/// whether the resulting group of objects fits the mode of the
/// solution. If so it returns the number of objects in the resulting
/// group node, otherwise it returns false.
Solution.prototype.check_scene = function(scene) {
	var curr_group = GroupNode.sceneGroup(scene);
	var prev_group = curr_group;
	this.sels.forEach(function (sel) {
		prev_group = curr_group;
	  curr_group = sel.select(curr_group, scene);
	});
	var N = curr_group.objs.length;
	var res = false;
	if (this.mode == 'unique' && N == 1) res = 1;
	else if (this.mode == 'exists' && N > 0) res = N;
	else if (this.mode == 'all' && N > 0 &&
	    prev_group.objs.length == N) res = N;
	scene.fits_solution = !!res;
	return res;
}

/// Returns a human readable description of the solution.
Solution.prototype.describe = function() {
	var str = "Only in the " + this.main_side + " scenes, ";
	str += this.mode + ': ';
	str += this.sels.map(function (sel, i) { return (i==0 ? sel.describe() : sel.describe2(true)) }).join(', ');
	return str;
};