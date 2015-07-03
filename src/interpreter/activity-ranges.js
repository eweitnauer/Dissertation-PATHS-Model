/// Used to keep track of feature activation ranges seen over the scenes of
/// each side (minmin, minmax, maxmin, maxmax per side).
/// Based on this information, the threshold of a feature can be adjusted to
/// allow for a solution.
ActivityRanges = function() {
	this.ranges = {};
}

ActivityRanges.update = function(percept, time) {
	var scene;
	if (percept.obj) scene = percept.obj.object_node.scene_node;
	else scene = percept.group.scene_node;
	scene.activity_ranges.update(percept, time);
}

ActivityRanges.prototype.update = function(percept, time) {
	var key = time + '.' + percept.key + '.'
	        + (percept.targetType === 'obj' ? 'object' : 'group');
	var act = percept.get_activity();

	if (!this.ranges[key]) this.ranges[key] = { min: 1, max: 0 };

	var d = this.ranges[key];

	d.min = Math.min(d.min, act);
	d.max = Math.max(d.max, act);
}

ActivityRanges.prototype.get = function(key) {
	return this.ranges[key];
}

ActivityRanges.calcStats = function(selector, scenes) {
	var res = {};
	selector.forEachMatcher(function(m) {
		var key = m.time + '.' + m.key + '.' + m.type;
		if (!res[key]) res[key] = { minmin:1, minmax:1, maxmin:0, maxmax:0 };
		for (var i=0; i<scenes.length; i++) {
	  	var range = scenes[i].activity_ranges[key];
	  	if (!range) continue;
	  	res[key].minmin = Math.min(range.min, res[key].minmin);
	  	res[key].minmax = Math.min(range.max, res[key].minmax);
	  	res[key].maxmin = Math.max(range.min, res[key].maxmin);
	  	res[key].maxmax = Math.max(range.max, res[key].maxmax);
		}
	});
	return res;
}
