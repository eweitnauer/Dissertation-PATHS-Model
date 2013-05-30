// Copyright 2013, Erik Weitnauer.

var Solution = {};

/// Solution of the type "There is always an xxx on the main_side, but not on the other_side." ///////////////////////////
/// main_side is either 'left' or 'right' (default: 'left').
Solution.Exists = function(sel, main_side) {
	this.sel = sel;
	this.main_side = main_side || 'left';
	this.other_side = {left: 'right', right: 'left'}[this.main_side];
}

/// Returns true if all scenes match the respecive selector.
Solution.Exists.prototype.check = function(scenes_l, scenes_r) {
	var a = this.main_side == 'left'  ? scenes_l : scenes_r
	   ,b = this.main_side == 'right' ? scenes_l : scenes_r;
	var thiz = this;
	return a.every(function (scene) { return thiz.sel.select(scene).length >= 1}) &&
	    	 b.every(function (scene) { return thiz.sel.select(scene).length == 0});
};

/// Returns a human readable description of the solution.
Solution.Exists.prototype.describe = function() {
	return "There is an object that is " + this.sel.describe(true) +
	       " in the " + this.main_side + " scenes, but not in the " +
	       {left: 'right', right: 'left'}[this.main_side] + " scenes";
};


/// Solution of the type "Everything on the main_side is xxx, everything on the other_side is yyy." ///////////////////////////
/// main_side is either 'left' or 'right' (default: 'left').
Solution.All = function(sel1, sel2, main_side) {
	this.main_side = main_side || 'left';
	this.other_side = {left: 'right', right: 'left'}[this.main_side];
	this.sel = {};
	this.sel[this.main_side] = sel1;
	this.sel[this.other_side] = sel2;
}

/// Returns true if all scenes match the respecive selector.
Solution.All.prototype.check = function(scenes_l, scenes_r) {
	var thiz = this;
	return scenes_l.every(function (scene) { return scene.objs.every(thiz.sel.left.matches.bind(thiz.sel.left)) }) &&
				 scenes_r.every(function (scene) { return !scene.objs.some(thiz.sel.left.matches.bind(thiz.sel.left)) }) &&
				 scenes_r.every(function (scene) { return scene.objs.every(thiz.sel.right.matches.bind(thiz.sel.right)) }) &&
				 scenes_l.every(function (scene) { return !scene.objs.some(thiz.sel.right.matches.bind(thiz.sel.right)) });
};

/// Returns a human readable description of the solution.
Solution.All.prototype.describe = function() {
	return "On the left every object is "  + this.sel.left.describe(true) +
	     ", on the right every object is " + this.sel.right.describe(true);
};