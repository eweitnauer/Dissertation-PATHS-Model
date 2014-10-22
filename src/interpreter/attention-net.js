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
AttentionNet = function() {
	this.features = [];
	this.solutions = [];
	this.objects = [];
	this.objects_by_scene = null; // internal cache
	this.attention_values = new WeakMap();
	this.cps = 15; // complexity penalty steepness
}

/// In google, search for 1/(1+exp(8*(0.5-x))) from -0.1 to 1.1
AttentionNet.prototype.sigmoid = function(x) {
	//return x;
	if (x===0) return 0;
	return 1/(1+Math.exp(8*(0.5-x)));
}

AttentionNet.prototype.setComplexityPenaltySteepness = function(val) {
	this.cps = val;
}

/// google: plot 1-1/(1+exp(15*(0.25-x/10)))  from 0 to 10
AttentionNet.prototype.getPosteriori = function(sol) {
	if (sol instanceof Solution)
		return 1-1/(1+Math.exp(this.cps*(0.25-sol.sel.getComplexity()/10)));
	else return 1;
}

/// Clamps all attention values of the passed type ('features',
/// 'solutions', 'objects') to the passed interval. The default
/// for the interval is min=0 and max=1. Pass a cooldown to have it
/// subtracted from all attention values before clamping.
/// Attention values of 0 will not be changed at all.
AttentionNet.prototype.clamp = function(type, min, max, cooldown) {
	if (typeof(min) === 'undefined') min = 0;
	if (typeof(max) === 'undefined') max = 1;
	if (!type || type === 'all') {
		this.clamp('features', min, max, cooldown);
		this.clamp('solutions', min, max, cooldown);
		this.clamp('objects', min, max, cooldown);
		return;
	}
	var att, i;
	for (i=0; i<this[type].length; i++) {
		att = this.attention_values.get(this[type][i]);
		if (att === 0) continue;
		if (cooldown) att -= cooldown;
		att = att < min ? min : att;
		att = att > max ? max : att;
		this.attention_values.set(this[type][i], att);
	}
}

/// Updates all attention values, so that for 'features', 'solutions'
/// and 'objects' the attentions add up to 1.
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
		for (var scene in objs)	this.normalizeElements(objs[scene]);
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

/// Can throw "unknown element" exception.
AttentionNet.prototype.getAttentionValue = function(el) {
	if (!this.attention_values.has(el)) throw "unknown element";
	return this.sigmoid(this.attention_values.get(el)) * this.getPosteriori(el);
}

AttentionNet.prototype.getAttentionValueNoSigmoid = function(el) {
	if (!this.attention_values.has(el)) throw "unknown element";
	return this.attention_values.get(el) * this.getPosteriori(el);
}

/// Can throw "unknown element" exception.
AttentionNet.prototype.setAttentionValue = function(el, val) {
	if (!this.attention_values.has(el)) throw "unknown element";
	return this.attention_values.set(el, val);
}

/// Can throw "unknown element" exception.
AttentionNet.prototype.addToAttentionValue = function(el, delta, min, max) {
	if (!this.attention_values.has(el)) throw "unknown element";
	var val = this.attention_values.get(el)+delta;
	if (typeof(min) === 'number' && typeof(max) === 'number')
	  val = Math.min(Math.max(min, val), max);
	return this.attention_values.set(el, val);
}

/// Returns true if successfully inserted. Optionally pass an attention value
/// (default: 1.0).
AttentionNet.prototype.addFeature = function(feature, val) {
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
/// Available options:
/// filter (ObjectNode->bool)
AttentionNet.prototype.getRandomObject = function(scene, options) {
	options = options || {};
	var self = this;
	var objs = scene.objs.filter(function(obj) {
		return ( self.getAttentionValue(obj) > 0
		     && (!options.filter || options.filter(obj)));
	});
	if (objs.length === 0) return null;
	return Random.pick_weighted(objs, function (obj) {
		return self.getAttentionValue(obj);
	});
}

/// Chooses a random object from the passed scene based on their attention values.
/// Available options: type ('obj' or 'group'), filter (Feature->bool), pool (array)
AttentionNet.prototype.getRandomFeature = function(options) {
	options = options || {};
	var self = this;
	var pool = options.pool || this.features;
	var features = pool.filter(function(feature) {
		return ( self.getAttentionValue(feature) > 0
			   && (!options.type || feature.prototype.targetType === options.type)
		     && (!options.filter || options.filter(feature)));
	});
	if (features.length === 0) return null;
	return Random.pick_weighted(features, function (feature) {
		return self.getAttentionValue(feature);
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
		return (self.getAttentionValue(sol) > 0
			&& (!options.no_blank || !sol.sel.blank())
		  && (!options.type || sol.sel.getType() === options.type)
		  && (!options.filter || options.filter(sol)));
	});
	if (sols.length === 0) return null;
	return Random.pick_weighted(sols, function (sol) {
		return self.getAttentionValue(sol);
	});
}