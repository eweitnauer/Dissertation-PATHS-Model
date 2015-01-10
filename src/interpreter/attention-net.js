// Copyright Erik Weitnauer 2014

/**
 * The AttentionNet keeps track of an attention value for each attribute,
 * relationship and solution added to it. It can visualize solutions and
 * features with their attention values. It can be used to increase and
 * decrease attention, as well as retrieving attention.
 *
 * The attention base values are translated into the real attention values
 * using a sigmoid function. Attention values should only be changed using
 * the addToAttentionValue function.
 */
AttentionNet = function(options) {
	this.features = [];
	this.solutions = [];
	this.objects = [];
	this.objects_by_scene = null; // internal cache, keys are scene ids
	this.attention_values = new WeakMap();
	this.feature_groups = [];

	this.specificity_base = options.activity.hypothesis.specificity_base;
	this.feature_base = options.activity.feature.hyp_base;
	this.object_base = options.activity.obj.hyp_base;
	this.obj_attr_priors = options.activity.obj.attr_priors;
	this.obj_rel_priors = options.activity.obj.rel_priors;
}

/// Can throw "unknown element" exception.
AttentionNet.prototype.getActivity = function(el) {
	if (!this.attention_values.has(el)) throw "unknown element";
	return this.attention_values.get(el);
}

AttentionNet.prototype.updateActivities = function() {
	var self = this;
	this.solutions.forEach(function(sol) {
		self.attention_values.set(sol, self.calcSolutionActivity(sol))
	});
	this.normalize('solutions');

	this.features.forEach(function(feat) {
		self.attention_values.set(feat, self.calcFeatureSelfActivity(feat))
	});
	// uncomment the following to use feature group activity spreading
	// this.feature_groups.forEach(function(fg) {
	// 	self.attention_values.set(fg, self.calcFeatureGroupActivity(fg))
	// });
	// this.features.forEach(function(feat) {
	// 	self.attention_values.set(feat, self.calcFeatureActivity(feat));
	// });
	this.normalize('features');

	this.objects.forEach(function(obj) {
		self.attention_values.set(obj, self.calcObjectActivity(obj))
	});
	this.normalize('objects');
}

AttentionNet.prototype.calcSolutionActivity = function(sol) {
	if (sol.main_side === 'fail') return 0;
	var exp = sol.uncheckedSceneCount() + sol.sel.getComplexity();
	if (sol.main_side === 'both') {
		exp += sol.scene_pair_count;
		if (!sol.allMatch()) exp += sol.incompatibleMatchCount();
	}
	return Math.pow(2, -exp) * (sol.objects_seen ? (sol.objects_seen / sol.objects_selected) : 1);

	// return Math.pow(0.5, sol.sel.getComplexity()
	// 	                 + sol.uncheckedSceneCount()
	// 	                 + 2*sol.incompatibleMatchCount())
	// 	   * (sol.specificity+this.specificity_base);

	// return Math.pow(0.5, sol.sel.getComplexity()
	// 	                 + sol.scene_pair_count*2
	// 	                 - sol.goodSidesCompatibleCount())
	// 	   * (sol.specificity+this.specificity_base);
}

AttentionNet.prototype.calcFeatureSelfActivity = function(feat) {
	//return 1;
	var self = this;
	var sum = d3.sum(this.solutions, function(sol) {
		if (!sol.sel.hasFeatureType(feat.prototype)) return 0;
		else return self.getActivity(sol);
	});
	var val = feat.prototype.apriori * (this.feature_base+sum);
	return val;
}

AttentionNet.prototype.calcFeatureActivity = function(feat) {
	var fg = this.getOrCreateFeatureGroupByName(feat.group_name);
	var f_act = this.getActivity(feat)
	  , g_act = this.getActivity(fg)
	  , res = f_act + Math.max(0, 0.5*(g_act - f_act));
	//console.log(feat.prototype.key, 'self', f_act, 'group', g_act, 'res', res);
	return res;
}

AttentionNet.prototype.calcFeatureGroupActivity = function(fg) {
	var sum = 0;
	for (var i=0; i<fg.members.length; i++) {
	  sum += this.getActivity(fg.members[i]);
	}
	return sum/fg.members.length;
}

AttentionNet.prototype.calcObjectActivity = function(obj) {
	//return 1;
	var self = this;
	var sum = d3.sum(obj.selectors, function(sel) {
		return self.getActivity(sel.solution);
	});
	return this.getObjectPrior(obj) * (this.object_base+sum);
}

AttentionNet.prototype.getObjectPrior = function(obj) {
	var prod = 1, perception;
	for (var attr in this.obj_attr_priors) {
		perception = obj.getFromCache(attr, {time: 'start'});
		if (perception && this.isActive(perception)) prod *= this.obj_attr_priors[attr];
	}
	// for (var rel in this.obj_rel_priors) {
	// 	perception = obj.getFromCache(rel, {time: 'start'});
	// 	if (perception && this.isActive(perception)) prod *= this.obj_rel_priors[rel][0];
	// 	// we should also check for this object being the `other` object in a relationship
	// }
	return prod;
}

AttentionNet.prototype.isActive = function(percept) {
  return percept.get_activity() > pbpSettings.activation_threshold;
}

/// Updates all attention values, so that for 'features', 'solutions'
/// and 'objects' the attentions add up to 1 (per scene for objects).
/// The `type` argument is optional, if not passed, all types are
/// normalized.
AttentionNet.prototype.normalize = function(type) {
	if (!type) {
		this.normalize('features');
		this.normalize('solutions');
		this.normalize('objects');
		return;
	}
	if (type === 'objects') {
		var objs = this.objectsByScene();
		for (var idx in objs)	this.normalizeElements(objs[idx]);
	} else {
		this.normalizeElements(this[type]);
	}
}

/// Scales the attention values of the passed elements so they sum up to 1.
AttentionNet.prototype.normalizeElements = function(els) {
	var sum = 0, i;
	for (i=0; i<els.length; i++) sum += this.attention_values.get(els[i]);
	if (sum === 0) return;
	for (i=0; i<els.length; i++) {
		this.attention_values.set(els[i], this.attention_values.get(els[i])/sum);
	}
}

/// Returns all objects grouped by scenes. Will cache results of first call,
/// so only call after all objects were added.
AttentionNet.prototype.objectsByScene = function() {
	if (!this.objects_by_scene) {
		var objs = {}, obj;
		for (var i=0; i<this.objects.length; i++) {
		  obj = this.objects[i];
		  if (!(obj.scene_node.id in objs)) objs[obj.scene_node.id] = [];
		  objs[obj.scene_node.id].push(obj);
		}
		this.objects_by_scene = objs;
	}
	return this.objects_by_scene;
}

/// Type can be 'feature', 'solution' and 'object'. Optionally pass an
/// attention value (default: 1.0).
/// Returns true if successfully inserted.
AttentionNet.prototype.addElement = function(type, element, val) {
	if (typeof(val) === 'undefined') val = 1.0;
	var map = {feature: this.features, solution: this.solutions, object: this.objects};
	var arr = map[type];
	if (!arr) return false;
	if (arr.indexOf(element) != -1) return false;
	arr.push(element);
	this.attention_values.set(element, val);
	return true;
}

AttentionNet.prototype.getOrCreateFeatureGroupByName = function(name) {
	var fgs = this.feature_groups.filter(function(fg) { return fg.name === name });
	if (fgs.length === 0) {
		var fg = { name: name, members: [] };
		this.feature_groups.push(fg);
		return fg;
	}
	return fgs[0];
}

/// Returns true if successfully inserted. Optionally pass an attention value
/// (default: 1.0).
AttentionNet.prototype.addFeature = function(feature, group_name, val) {
	var fg = this.getOrCreateFeatureGroupByName(group_name);
	fg.members.push(feature);
	feature.group_name = group_name;
	return this.addElement('feature', feature, val);
}

/// Returns true if successfully inserted. Optionally pass an attention value
/// (default: 1.0).
AttentionNet.prototype.addSolution = function(solution, val) {
	return this.addElement('solution', solution, val);
}

/// Returns true if successfully inserted. Optionally pass an attention value
/// (default: 1.0).
AttentionNet.prototype.addObject = function(object, val) {
	return this.addElement('object', object, val);
}

/// Chooses a random object from the passed scene based on their attention values.
/// If the objects have a summed activity of 0, any on of them is picked.
/// Available options:
/// filter (ObjectNode->bool)
AttentionNet.prototype.getRandomObject = function(scene, options) {
	options = options || {};
	var self = this;
	var activity_sum = 0;
	var objs = scene.objs.filter(function(obj) {
		if (!options.filter || options.filter(obj)) {
			activity_sum += self.getActivity(obj);
			return true;
		} else return false;
	});
	if (objs.length === 0) return null;
	if (activity_sum > 0) return Random.pick_weighted(objs, function (obj) {
		return self.getActivity(obj);
	});
	else return Random.pick(objs);
}

/// Chooses a random object from the passed scene based on their attention values.
/// Available options: type ('obj' or 'group'), filter (Feature->bool), pool (array)
AttentionNet.prototype.getRandomFeature = function(options) {
	options = options || {};
	var self = this;
	var pool = options.pool || this.features;
	var features = pool.filter(function(feature) {
		return ( self.getActivity(feature) > 0
			   && (!options.type || feature.prototype.targetType === options.type)
		     && (!options.filter || options.filter(feature)));
	});
	if (features.length === 0) return null;
	return Random.pick_weighted(features, function (feature) {
		return self.getActivity(feature);
	});
}

/// Chooses a random object from the passed scene based on their attention values.
/// Available options:
/// no_blank (bool), type ('group' or 'object'),
/// filter (function), pool (array), main_side ('both', 'left', 'right', 'fail')
AttentionNet.prototype.getRandomSolution = function(options) {
	options = options || {};
	var self = this;
	var pool = options.pool || this.solutions;
	var sols = pool.filter(function(sol) {
		return (self.getActivity(sol) > 0
			&& (!options.no_blank || !sol.sel.blank())
		  && (!options.type || sol.sel.getType() === options.type)
		  && (!options.filter || options.filter(sol)));
	});
	if (sols.length === 0) return null;
	return Random.pick_weighted(sols, function (sol) {
		return self.getActivity(sol);
	});
}
