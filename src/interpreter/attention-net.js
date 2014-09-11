// Copyright Erik Weitnauer 2014

/*
Development goal:

The AttentionNet keeps track of an attention value for each attribute, relationship
and selector added to it. It knows about connections between the feature types along
which the attention flows can visualize both the current attention values in a grid
layout and the connection structure in a force graph layout. It has methods to increase
and decrease attention, spread attention and to pick a random element based on attention.

First steps:

* add an attribute or relationships to the the attentionNet
* add a selector to the attentionNet
* add an object to the attentionNet
* get the attention-value for any element in the attentionNet
* select an attr/rel/selector randomly but weighted by their attentions
* boost the attention to an element in the attentionNet
* use WeakMap
*/

AttentionNet = function() {
	this.features = [];
	this.selectors = [];
	this.objects = [];
	this.objects_by_scene = null; // internal cache
	this.attention_values = new WeakMap();
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
	return this.attention_values.get(el);
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
	if (arguments.length === 4) val = Math.min(Math.max(min, val), max);
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
		  return self.attention_values.get(onode);
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
			return self.attention_values.get(feature);
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
		return self.attention_values.get(sel);
	});
}

/// Chooses a random object from the passed scene based on their attention values.
AttentionNet.prototype.getRandomObjectOrSelector = function(scene) {
	var elements = this.selectors.contact(scene.objs);
	try {
		return Random.pick_weighted(elements, function (el) {
			if (!self.attention_values.has(el)) throw "unknown object";
			return self.attention_values.get(el);
		});
	} catch (e) {
		if (!(e instanceof String)) throw e;
		return null;
	}
}
