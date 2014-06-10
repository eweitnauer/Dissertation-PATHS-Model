// Copyright 2013, Erik Weitnauer.

/// Holds an array of selectors.
/// Can be in one of 3 different modes: unique, exists, all.
/// main_side is either 'left' or 'right' (default: 'left').
Solution = function(mode, main_side) {
	this.sels = [];
	this.mode = mode;
	this.main_side = main_side || 'left';
	this.other_side = {left: 'right', right: 'left'}[this.main_side];
}

Solution.prototype.check = function(scenes_l, scenes_r) {
	var main_scenes  = this.main_side == 'left'  ? scenes_l : scenes_r
	   ,other_scenes = this.main_side == 'right' ? scenes_l : scenes_r;

	return (main_scenes.every(this.check_scene.bind(this))
		     && !other_scenes.some(this.check_scene.bind(this)));
}

/// Applies all selectors consecutively to the scene and checks
/// whether the resulting group of objects fits the mode of the
/// solution. If so it returns ture, otherwise false.
Solution.prototype.check_scene = function(scene) {
	var curr_group = GroupNode.sceneGroup(scene);
	var prev_group = curr_group;
	this.sels.forEach(function (sel) {
		prev_group = curr_group;
	  curr_group = sel.select(curr_group, scene);
	}
	if (this.mode == 'unique' && curr_group.objs.length == 1) return true;
	if (this.mode == 'exists' && curr_group.objs.length > 0) return true;
	if (this.mode == 'all' && curr_group.objs.length > 0 &&
	    prev_group.objs.length == curr_group.objs.length) return true;
	return false;
}

/// Returns a human readable description of the solution.
Solution.prototype.describe = function() {
	var str = "Only in the " + this.main_side + " scenes, ";
	str += this.sels.map(function (sel) { return '['+sel.describe()+']' }).join(', ');
	return str;
};