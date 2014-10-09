// Copyright 2014, Erik Weitnauer.

/// Holds an array of selectors.
/// Can be in one of 3 different modes: 'unique', 'exists', 'all'
/// (the default is 'exists').
/// main_side is either 'left', 'right', 'both'
Solution = function(selector, main_side, mode) {
	this.sel = selector;
	this.mode = mode || 'exists';
	this.setMainSide(main_side);
	this.matchedAgainst = [];
	this.lchecks = 0;
	this.rchecks = 0;
	this.lmatches = 0;
	this.rmatches = 0;
	this.scene_pair_count = 8;
	this.selects_single_objs = true;
}

Solution.prototype.setMainSide = function (main_side) {
	this.main_side = main_side || 'both';
	this.other_side = {left: 'right', right: 'left'}[this.main_side];
  return this;
}

Solution.prototype.wasMatchedAgainst = function(scene_pair_id) {
	return this.matchedAgainst.indexOf(scene_pair_id) !== -1;
}

Solution.prototype.isSolution = function() {
	return ( this.rmatches === 0 && this.lmatches == this.scene_pair_count
	      || this.lmatches === 0 && this.rmatches == this.scene_pair_count);
}

Solution.prototype.checkScenePair = function(pair, pair_id) {
  var self = this;
  var selected_groups = [];
  pair.forEach(function (scene) {
  	var res_group = self.sel.applyToScene(scene);
    selected_groups.push(res_group);
    if (res_group.objs.length > 1) self.selects_single_objs = false;
    var matches = !res_group.empty();
    if (scene.side === 'left') {self.lchecks++; if (matches) self.lmatches++ }
    if (scene.side === 'right') {self.rchecks++; if (matches) self.rmatches++ }
  });
  this.matchedAgainst.push(pair_id);

  if (this.lmatches === 0 && this.rmatches === this.rchecks) this.setMainSide('right');
  else if (this.rmatches === 0 && this.lmatches === this.lchecks) this.setMainSide('left');
  else if (this.lmatches > 0 && this.rmatches === this.rchecks) this.setMainSide('both');
  else if (this.rmatches > 0 && this.lmatches === this.lchecks) this.setMainSide('both');
  else this.setMainSide('fail');

  return selected_groups;
}

Solution.prototype.check = function(scenes_l, scenes_r) {
	if (this.side !== 'left' && this.side !== 'right') return false;

	var main_scenes  = this.main_side == 'left'  ? scenes_l : scenes_r
	   ,other_scenes = this.main_side == 'right' ? scenes_l : scenes_r;

	return (main_scenes.every(this.check_scene.bind(this))
		     && !other_scenes.some(this.check_scene.bind(this)));
}

Solution.prototype.equals = function(other) {
	return (this.mode === other.mode
	     && this.sel.equals(other.sel));
}

Solution.prototype.mergedWith = function(other) {
	var mode = (this.mode === other.mode ? mode : 'exists');
	var side;
	if (other.main_side === this.main_side) side = this.main_side;
	else if (this.main_side === 'both') side = other.main_side;
	else if (other.main_side === 'both') side = this.main_side;
	else return null; // incompatible sides
	return new Solution(this.sel.mergedWith(other.sel), side, mode);
}

Solution.prototype.clone = function() {
	return new Solution(this.sel.clone(), this.main_side, this.mode);
}

/// Returns a group node that contains all objects that match the solution
/// in the passed scene.
Solution.prototype.applyToScene = function(scene) {
	if (this.main_side === 'left' && scene.side !== 'left') return new GroupNode(null, [], this.sel);
	if (this.main_side === 'right' && scene.side !== 'right') return new GroupNode(null, [], this.sel);
	return this.sel.applyToScene(scene);
}

/// Applies all selectors consecutively to the scene and checks
/// whether the resulting group of objects fits the mode of the
/// solution. If so it returns the number of objects in the resulting
/// group node, otherwise it returns false.
Solution.prototype.check_scene = function(scene) {
	var group0 = GroupNode.sceneGroup(scene);
	var group1 = this.sel.select(group0, scene);
	var N = group1.objs.length;
	var res = false;
	if (this.mode == 'unique' && N == 1) res = 1;
	else if (this.mode == 'exists' && N > 0) res = N;
	else if (this.mode == 'all' && N > 0 &&
	    group0.objs.length == N) res = N;
	scene.fits_solution = !!res;
	return res;
}

/// Returns a human readable description of the solution.
Solution.prototype.describe = function() {
	var str = "";
	if (this.main_side) str += this.main_side === 'both' ? "In all scenes, " : "Only in the " + this.main_side + " scenes, ";
	str += this.mode + ': ' + this.sel.describe();
	return str;
};