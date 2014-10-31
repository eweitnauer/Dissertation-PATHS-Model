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
	this.checks = {left: 0, right: 0};
	this.matches = {left: 0, right: 0};
	this.selects_all_objs = {left: 0, right: 0};
	this.selects_single_objs = {left: 0, right: 0};
	this.scene_pair_count = 8;
//	this.selects_single_objs = true;
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
	return ( this.matches.right === 0 && this.matches.left == this.scene_pair_count
	      || this.matches.left === 0 && this.matches.right == this.scene_pair_count);
}

/// Returns whether combining this with the passed solution could in principle
/// be a solution.
Solution.prototype.compatibleWith = function(other) {
	if ( this.matches.left   < this.checks.left
	  && other.matches.right < other.checks.right) return false;
	if ( this.matches.right < this.checks.right
	  && other.matches.left < other.checks.left) return false;
	return true;
}

Solution.prototype.selectsSingleObjects = function() {
	return this.selects_single_objs.left === this.checks.left &&
	       this.selects_single_objs.right === this.checks.right;
}

Solution.prototype.selectsAllObjects = function() {
	return this.selects_all_objs.left === this.checks.left &&
	       this.selects_all_objs.right === this.checks.right;
}

Solution.prototype.tryAllMode = function() {
  if (this.mode === 'all') return false;
  var main, other;
  if ( this.selects_all_objs.left === this.checks.left
    && this.selects_all_objs.right === 0) { main = 'left'; other = 'right' }
  if ( this.selects_all_objs.right === this.checks.right
    && this.selects_all_objs.left === 0) { main = 'right'; other = 'left' }
  if (!main) return false;
	this.mode = 'all';
  this.setMainSide(main);
	this.matches[main] = this.checks[main];
  this.matches[other] = 0;
  return true;
}

Solution.prototype.tryUniqueMode = function() {
  if (this.mode === 'unique') return false;
  var main, other;
  if ( this.selects_single_objs.left === this.checks.left
    && this.selects_single_objs.right === 0) { main = 'left'; other = 'right' }
  if ( this.selects_single_objs.right === this.checks.right
    && this.selects_single_objs.left === 0) { main = 'right'; other = 'left' }
  if (!main) return false;
	this.mode = 'unique';
	this.setMainSide(main);
	this.matches[main] = this.checks[main];
  this.matches[other] = 0;
  return true;
}

Solution.prototype.checkScenePair = function(pair, pair_id) {
  var self = this;
  var selected_groups = [];
  pair.forEach(function (scene) {
  	var res = self.check_scene(scene);
    selected_groups.push(res.group);
    if (res.group.objs.length === 1) self.selects_single_objs[scene.side]++;
    if (res.group.objs.length === scene.objs.length) self.selects_all_objs[scene.side]++;
    self.checks[scene.side]++;
    if (res.match) self.matches[scene.side]++;
  });
  this.matchedAgainst.push(pair_id);

  if (this.matches.left === 0 && this.matches.right === this.checks.right) this.setMainSide('right');
  else if (this.matches.right === 0 && this.matches.left === this.checks.left) this.setMainSide('left');
  else if (this.tryAllMode()) {}
  else if (this.tryUniqueMode()) {}
  else if (this.matches.left > 0 && this.matches.right === this.checks.right) this.setMainSide('both');
  else if (this.matches.right > 0 && this.matches.left === this.checks.left) this.setMainSide('both');
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
	var mode = 'exists'; // always use 'exists' as we automatically switch to the
	                     // other modes if needed
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
/// solution. It returns an object { match: boolean, group: GroupNode }
/// where group is the group of the selected nodes.
Solution.prototype.check_scene = function(scene) {
	var group = this.sel.applyToScene(scene);
	var N = group.objs.length;
	var res = false;
	if (this.mode == 'unique' && N == 1) res = true;
	else if (this.mode === 'exists' && N > 0) res = true;
	else if (this.mode === 'all' && N > 0 &&
	    scene.objs.length === N) res = true;
	scene.fits_solution = res;
	return { match: res, group: group };
}

/// Returns a human readable description of the solution.
Solution.prototype.describe = function() {
	var str = "";
	if (this.main_side) str += this.main_side === 'both' ? "In all scenes, " : "Only in the " + this.main_side + " scenes, ";
	str += this.mode + ': ' + this.sel.describe();
	return str;
};
