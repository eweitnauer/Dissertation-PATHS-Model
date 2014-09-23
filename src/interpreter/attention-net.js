// Copyright Erik Weitnauer 2014

/**
 * The AttentionNet keeps track of an attention value for each attribute,
 * relationship and selector added to it. It can visualize selectors and
 * features with their attention values. It can be used to increase and
 * decrease attention, as well as retrieving attention.
 *
 * The attention base values are translated into the real attention values
 * using a sigmoid function. Attention values should only be changed using
 * the addToAttentionValue function.
 */
AttentionNet = function() {
	this.features = [];
	this.selectors = [];
	this.objects = [];
	this.objects_by_scene = null; // internal cache
	this.attention_values = new WeakMap();
}

/// In google, search for 1/(1+exp(8*(0.5-x))) from -0.1 to 1.1
AttentionNet.prototype.sigmoid = function(x) {
	if (x===0) return 0;
	return 1/(1+Math.exp(8*(0.5-x)));
}

/// Clamps all attention values of the passed type ('features',
/// 'selectors', 'objects') to the passed interval. The default
/// for the interval is min=0 and max=1. Pass a cooldown to have it
/// subtracted from all attention values before clamping.
/// Attention values of 0 will not be changed at all.
AttentionNet.prototype.clamp = function(type, min, max, cooldown) {
	if (typeof(min) === 'undefined') min = 0;
	if (typeof(max) === 'undefined') max = 1;
	if (!type || type === 'all') {
		this.clamp('features', min, max, cooldown);
		this.clamp('selectors', min, max, cooldown);
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

/// Updates all attention values, so that for 'features', 'selectors'
/// and 'objects' the attentions add up to 1.
/// The `type` argument is optional, if not passed, all types are
/// normalized.
AttentionNet.prototype.normalize = function(type) {
	if (!type) {
		this.normalize('features');
		this.normalize('selectors');
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

/// Type can be 'feature', 'selector' and 'object'. Optionally pass an
/// attention value (default: 1.0).
/// Returns true if successfully inserted.
AttentionNet.prototype.addElement = function(type, element, val) {
	if (typeof(val) === 'undefined') val = 1.0;
	var map = {feature: this.features, selector: this.selectors, object: this.objects};
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
	return this.sigmoid(this.attention_values.get(el));
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
AttentionNet.prototype.addSelector = function(selector, val) {
	if (this.selectors.some(function (sel) { return sel.equals(selector) })) return false;
	return this.addElement('selector', selector, val);
}

/// Returns true if successfully inserted. Optionally pass an attention value
/// (default: 1.0).
AttentionNet.prototype.addObject = function(object, val) {
	return this.addElement('object', object, val);
}

/// Chooses a random object from the passed scene based on their attention values.
AttentionNet.prototype.getRandomObject = function(scene) {
	var self = this;
	try {
		return Random.pick_weighted(scene.objs, function (onode) {
			if (!self.attention_values.has(onode)) throw "unknown object";
		  return self.getAttentionValue(onode);
		});
	} catch (e) {
		return null;
	}
}

/// Chooses a random object from the passed scene based on their attention values.
AttentionNet.prototype.getRandomFeature = function() {
	var self = this;
	try {
		return Random.pick_weighted(this.features, function (feature) {
			return self.getAttentionValue(feature);
		});
	} catch (e) {
		if (!(e instanceof String)) throw e;
		return null;
	}
}

/// Chooses a random object from the passed scene based on their attention values.
/// Available options:
/// no_blank (bool), type ('group' or 'object'), filter (function)
AttentionNet.prototype.getRandomSelector = function(options) {
	options = options || {};
	var self = this;
	var sels = this.selectors.filter(function(sel) {
		return (self.getAttentionValue(sel) > 0
			&& (!options.no_blank || !sel.blank())
		  && (!options.type || sel.getType() === options.type)
		  && (!options.filter || options.filter(sel)));
	});
	if (sels.length === 0) return null;
	return Random.pick_weighted(sels, function (sel) {
		return self.getAttentionValue(sel);
	});
}

/// Chooses a random object from the passed scene based on their attention values.
AttentionNet.prototype.getRandomObjectOrSelector = function(scene) {
	var elements = this.selectors.contact(scene.objs);
	try {
		return Random.pick_weighted(elements, function (el) {
			if (!self.attention_values.has(el)) throw "unknown object";
			return self.getAttentionValue(el);
		});
	} catch (e) {
		if (!(e instanceof String)) throw e;
		return null;
	}
}
