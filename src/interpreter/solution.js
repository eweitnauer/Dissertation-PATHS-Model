// Copyright 2014, Erik Weitnauer.

/// Holds an array of selectors.
/// Can be in one of 3 different modes: 'unique', 'exists', 'all'
/// (the default is 'exists').
/// main_side is either 'left', 'right', 'both'
Solution = function(selector, main_side, mode) {
	this.sel = selector;
	selector.solution = this;
	this.mode = mode || 'exists';
	this.setMainSide(main_side);
	this.matchedAgainst = [];
	this.checks = {left: 0, right: 0};
	this.mmatches = { exists: {left: 0, right: 0}
	                , unique: {left: 0, right: 0}
	                , all: {left: 0, right: 0}};
	this.specificity = 0; // `= avg(scene_sel_ratios)`
	this.scene_sel_ratios = []; // `=1-n_i/N_i`, where `n_i` is the number of sel. objs
	                            // and `N_i` the total number of objs. in scene i
	this.scene_pair_count = 8;
	this.objects_seen = 0;
	this.objects_selected = 0;
//	this.selects_single_objs = true;
}

Solution.prototype.matches = function(side) {
	return this.mmatches[this.mode][side];
}

Solution.prototype.setMainSide = function (main_side) {
	this.main_side = main_side || 'both';
	this.other_side = {left: 'right', right: 'left'}[this.main_side];
  return this;
}

Solution.prototype.getWeakSide = function() {
	if (this.main_side === 'left') return 'right';
	if (this.main_side === 'right') return 'left';
	if (this.main_side === 'fail') return 'fail';
	if (this.main_side === 'both') {
		if (this.checks.left > this.matches('left')) return 'left'; // only right all matched
		if (this.checks.right > this.matches('right')) return 'right'; // only left all matched
		// all match
		return (this.matches('left') > this.matches('right')) ? 'right' : 'left';
	}
}

Solution.prototype.allMatch = function() {
	return (this.checks.left === this.matches('left')
	 && this.checks.right === this.matches('right'));
}

Solution.prototype.goodSidesCompatibleCount = function() {
	if (this.main_side === 'fail') return 0;
	if (this.main_side === 'left' || this.main_side === 'right')
	  return this.checks.left + this.checks.right;
	// main side is 'both'
	if (this.checks.left > this.matches('left')) { // right scenes all matched
		return this.matches('right');
	}
	if (this.checks.right > this.matches('right')) { // left scenes all matched
		return this.matches('left');
	}
	// left and right scenes all matched
	return Math.min(this.matches('left'), this.matches('right'));
}

/** Returns the number of checked scenes those match is incompatible with a solution. */
Solution.prototype.incompatibleMatchCount = function() {
	if (this.main_side === 'left' || this.main_side === 'right') return 0;
	if (this.main_side === 'fail') return this.scene_pair_count*2;
	// main_side is 'both'
	if (this.checks.left > this.matches('left')) { // right scenes all matched
		return this.matches('left');
	}
	if (this.checks.right > this.matches('right')) { // left scenes all matched
		return this.matches('right');
	}
	// left and right scenes all matched
	return Math.min(this.matches('left'), this.matches('right'));
}

Solution.prototype.uncheckedSceneCount = function() {
	return this.scene_pair_count*2 - this.checks.left - this.checks.right;
}

/** Returns the number of checked scenes those match is compatible with a solution. */
Solution.prototype.compatibleMatchCount = function() {
	if (this.main_side === 'fail') return 0;
	if (this.main_side === 'left' || this.main_side === 'right') {
	  return this.checks.left + this.checks.right;
	}
	// main_side is 'both'
	if (this.checks.left > this.matches('left')) { // right scenes all matched
		return this.matches('right') + (this.checks.left - this.matches('left'));
	}
	if (this.checks.right > this.matches('right')) { // left scenes all matched
		return this.matches('left') + (this.checks.right - this.matches('right'));
	}
	// left and right scenes all matched
	return Math.max(this.matches('left'), this.matches('right'));
}

Solution.prototype.isPotentialSolution = function() {
	return this.main_side === 'left' || this.main_side === 'right';
}

Solution.prototype.wasMatchedAgainst = function(scene_pair_id) {
	return this.matchedAgainst.indexOf(scene_pair_id) !== -1;
}

Solution.prototype.isSolution = function() {
	if (this.matchedAgainst.length < this.scene_pair_count) return false;
	return ( this.matches('right') === 0 && this.matches('left') == this.scene_pair_count
	      || this.matches('left') === 0 && this.matches('right') == this.scene_pair_count);
}

Solution.prototype.updateSpecificity = function(scene, group) {
	if (group.empty()) return;
	var s = 1-group.objs.length/scene.objs.length;
	this.scene_sel_ratios.push(s);
	this.specificity = 0;
	for (var i=0; i<this.scene_sel_ratios.length; i++) {
		this.specificity += this.scene_sel_ratios[i];
	}
	this.specificity /= this.scene_sel_ratios.length;
}

/// Returns whether combining this with the passed solution could in principle
/// be a solution.
Solution.prototype.compatibleWith = function(other) {
	if ( this.matches('left')   < this.checks.left
	  && other.matches('right') < other.checks.right) return false;
	if ( this.matches('right') < this.checks.right
	  && other.matches('left') < other.checks.left) return false;
	return true;
}

Solution.prototype.selectsSingleObjects = function() {
	return this.selects_single_objs.left === this.checks.left &&
	       this.selects_single_objs.right === this.checks.right;
}

Solution.prototype.selectsAllObjects = function() {
	return this.mmatches.all.left === this.checks.left &&
	       this.mmatches.all.right === this.checks.right;
}

Solution.prototype.selectsAllObjectsInAllScenes = function() {
	return (this.selectsAllObjects() && this.uncheckedSceneCount() === 0
		&& this.matches('left') === this.matches('right'));
}

Solution.prototype.tryMode = function(mode, type) {
	if (mode === 'unique' && this.sel.blank()) return false;
	var matches = this.mmatches[mode];
	if (type === 'one-sided') {
		if (matches.left === 0 && matches.right === this.checks.right)
		  this.setMainSide('right');
  	else if (matches.right === 0 && matches.left === this.checks.left)
  	  this.setMainSide('left');
  	else return false;
	} else if (type === 'two-sided') {
		if (matches.left > 0 && matches.right === this.checks.right)
		  this.setMainSide('both');
    else if (matches.right > 0 && matches.left === this.checks.left)
      this.setMainSide('both');
    else return false;
	} else throw "unknown mode";
	this.mode = mode;
  return true;
}

Solution.prototype.checkScenePair = function(pair, pair_id) {
  if (this.matchedAgainst.indexOf(pair_id) !== -1) throw 'already checked that scene pair id!';
  var self = this;
  var selected_groups = [];
  pair.forEach(function (scene) {
  	var res = self.check_scene(scene);
    selected_groups.push(res.group);
    self.objects_seen += scene.objs.length;
    self.objects_selected += res.group.objs.length;
    self.updateSpecificity(scene, res.group);
    self.checks[scene.side]++;
    if (res.match_count) {
    	self.mmatches.exists[scene.side]++;
    	if (res.match_count === 1) self.mmatches.unique[scene.side]++;
    	if (res.match_count === scene.objs.length) self.mmatches.all[scene.side]++;
    }
  });
  this.matchedAgainst.push(pair_id);
  //this.recheck_all_checked_scenes(); // ONLY FOR DEBUGGING

  if (!this.tryMode('exists', 'one-sided') &&
  	  !this.tryMode('all', 'one-sided') &&
  	  !this.tryMode('unique', 'two-sided') &&
  	  !this.tryMode('exists', 'two-sided')) this.setMainSide('fail');

  return selected_groups;
}

/// Attempts to turn a 'both' or 'fail' solution into a one-sided solution by
/// adjusting one of the thresholds of the solution's selector. Returns true if
/// such an adjustment was made.
Solution.prototype.adjustThresholds = function(main_side, left_scenes, right_scenes) {
	var ranges = { left: ActivityRanges.calcStats(this.sel, left_scenes)
							 , right: ActivityRanges.calcStats(this.sel, right_scenes)};
	var other_side = (main_side === 'left' ? 'right' : 'left');
	var thresh;

	for (var key in ranges.left) {
		var main = ranges[main_side][key]
		  , other = ranges[other_side][key];

		// check for 'exists' solution
		if (other.maxmax < main.minmax) thresh = (other.maxmax + main.minmax)/2;

		// check for 'all' solution
		if (other.maxmin < main.minmin) thresh = (other.maxmin + main.minmin)/2;

		if (thresh && 0.15 <= thresh && 0.85 >= thresh) {
			var key_no_time = key.substr(key.indexOf('.')+1); // start.stable.object ==> stable.object
			this.sel.thresholds[key_no_time] = thresh;
			return true;
		}
	}

	return false;
}

/// Call this whenever the underlying selector is changed.
Solution.prototype.reset = function() {
	this.matchedAgainst = [];
	this.checks = {left: 0, right: 0};
	this.mmatches = { exists: {left: 0, right: 0}
	                , unique: {left: 0, right: 0}
	                , all: {left: 0, right: 0}};
	this.specificity = 0;
	this.scene_sel_ratios = [];
	this.scene_pair_count = 8;
	this.objects_seen = 0;
	this.objects_selected = 0;
}

Solution.prototype.check = function(scenes_l, scenes_r) {
	if (this.main_side !== 'left' && this.main_side !== 'right') return false;

	var main_scenes  = this.main_side == 'left'  ? scenes_l : scenes_r
	   ,other_scenes = this.main_side == 'right' ? scenes_l : scenes_r
	   ,self = this;

  var check_scene = function(scene) {
  	return self.check_scene(scene, true).match;
  }

	return (main_scenes.every(check_scene)
	     && !other_scenes.some(check_scene));
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
/// If no_caching is passed as true, all scene matches will be recomputed
/// and will not be cached.
Solution.prototype.check_scene = function(scene, no_caching) {
	var group = this.sel.applyToScene(scene, no_caching);
	var N = group.objs.length;
	var res = false;
	if (this.mode == 'unique' && N == 1) res = true;
	else if (this.mode === 'exists' && N > 0) res = true;
	else if (this.mode === 'all' && N > 0 &&
	    scene.objs.length === N) res = true;
	scene.fits_solution = res;
	return { match: res, group: group, match_count: N };
}

/// ONLY USED FOR DEBUGGING
///   to find the wrong solution bug
// Solution.prototype.recheck_all_checked_scenes = function() {
// 	var ws = tester.ws, self = this;
// 	var left = 0, right = 0;
// 	this.matchedAgainst.forEach(function(pair_id) {
// 		var scenes = ws.getScenePairById(pair_id);
// 		if (self.check_scene(scenes[0], true).match_count) {
// 			if (scenes[0].side == 'left') left++;
// 			else right++;
// 		}
// 		if (self.check_scene(scenes[1], true).match_count) {
// 			if (scenes[1].side == 'left') left++;
// 			else right++;
// 		}
// 	});
// 	if (this.mmatches.exists.left !== left || this.mmatches.exists.right !== right) {
// 		//throw "mismatch!!";
// 		this.matchedAgainst.forEach(function(pair_id) {
// 		var scenes = ws.getScenePairById(pair_id);
// 		if (self.check_scene(scenes[0], true).match_count) {
// 			if (scenes[0].side == 'left') left++;
// 			else right++;
// 		}
// 		if (self.check_scene(scenes[1], true).match_count) {
// 			if (scenes[1].side == 'left') left++;
// 			else right++;
// 		}
// 		});
// 	}
// }

/// Returns a human readable description of the solution.
Solution.prototype.describe = function() {
	var str = "";
	if (this.main_side) str += this.main_side === 'both' ? "In all scenes, " : "Only in the " + this.main_side + " scenes, ";
	str += this.mode + ': ' + this.sel.describe();
	return str;
};
