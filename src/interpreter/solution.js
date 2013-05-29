// Copyright 2013, Erik Weitnauer.

/// Solution of the type "There is an xxx in the left scenes, but not in the right scenes."
/// main_side is either 'left' or 'right' (default: 'left').
var SolutionExists = function(sel, main_side) {
	this.sel = sel;
	this.main_side = main_side || 'left';
}

/// Returns true if all scenes match the respecive selector.
SolutionExists.prototype.check = function(scenes_l, scenes_r) {
	var a = this.main_side == 'left'  ? scenes_l : scenes_r
	   ,b = this.main_side == 'right' ? scenes_l : scenes_r;
	if (this.main_side == 'left') {}
	var thiz = this;
	return a.every(function (scene) { return thiz.sel.select(scene).length >= 1}) &&
	    	 b.every(function (scene) { return thiz.sel.select(scene).length == 0});
};

/// Returns a human readable description of the solution.
SolutionExists.prototype.describe = function() {
	return "There is " + this.sel.describe(true) +
	       " in the " + this.main_side + " scenes, but not in the " +
	       {left: 'right', right: 'left'}[this.main_side] + " scenes.";
};