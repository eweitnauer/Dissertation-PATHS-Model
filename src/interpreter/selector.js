// Copyright 2014, Erik Weitnauer.

/** The Selector is used to focus on a subset of objects in a scene based on
 * a number of attributes and relations that must be fullfilled.
 * The selector can either have group or object attributes & relationships.
 * For obj. attrs, select() collects all matching objects inside a new group.
 * For group attrs, select() will return the whole group if it matches or
 * an empty group if it does not match.
 * The selector can be in unique mode, which means that result groups with more
 * than one element are returned as empty groups instead.
 *
 * The perceptions done during the application of the selector will not be
 * cached. */

 // FIXME: unique is not doing what is described above. Instead, it is only
 // used in the RelMatcher to decide whether to match all or exactly one of the
 // things we relate to.
var Selector = function(unique) {
	this.obj_attrs = [];	  // object attributes
	this.grp_attrs = [];	  // group attributes
	this.rels = [];         // object relationships
	this.unique = !!unique;
	this.solution = null;   // the solution associated with this selector

	this.thresholds = { /*'unstable.object': 0.3*/ };   // can be used to map features (e.g. 'close.object') to custom thresholds

	this.cached_results = []; // array of groups that are resulted from applying this selector
	this.merged_with = []; // list of other selectors that were already merged with this one
	this.cached_complexity = null;
}

/// Can be 'object', 'group' or 'mixed'. A blank selector is of 'object' type.
Selector.prototype.getType = function() {
	if (this.blank()) return 'object';
	if (this.grp_attrs.length === 0) return 'object';
	if (this.obj_attrs.length === 0 && this.rels.length === 0) return 'group';
	return 'mixed';
}

Selector.prototype.getComplexity = function() {
	if (this.cached_complexity === null) {
		var c = 0;
		for (var i=0; i<this.obj_attrs.length; i++) {
		  c += this.obj_attrs[i].getComplexity();
		}
		for (var i=0; i<this.grp_attrs.length; i++) {
		  c += this.grp_attrs[i].getComplexity();
		}
		for (var i=0; i<this.rels.length; i++) {
		  c += this.rels[i].getComplexity();
		}
		if (this.blank()) c = 1;
		var neg_count = this.countNegations();
		if (neg_count > 0) c += Math.pow(2, neg_count);
		this.cached_complexity = c;
	}
	return this.cached_complexity + (this.solution.mode === 'unique' ? -1 : 0);
}

/// Returns true if the selector has no matchers and will therefore match anything.
Selector.prototype.blank = function() {
	return (this.obj_attrs.length === 0
	     && this.grp_attrs.length === 0
	     && this.rels.length === 0)
}

/// Returns true if the selector only has base-level features.
Selector.prototype.base_level_only = function() {
	if (this.grp_attrs.length > 0 || this.rels.length > 0) return false;
	return this.obj_attrs.every(function(attr) { return attr.base_level && attr.active });
}

Selector.prototype.hasRelationships = function() {
	return this.rels.length > 0;
}

Selector.prototype.featureCount = function() {
	return this.obj_attrs.length + this.grp_attrs.length + this.rels.length;
}

/// Calls the passed function once for each feature that is part of the
/// selector.
Selector.prototype.forEachFeature = function(fn) {
	var i;
	for (i=0; i<this.obj_attrs.length; i++)
		fn(pbpSettings.obj_attrs[this.obj_attrs[i].key]);
	for (i=0; i<this.grp_attrs.length; i++)
		fn(pbpSettings.group_attrs[this.grp_attrs[i].key]);
	for (i=0; i<this.rels.length; i++) {
		fn(pbpSettings.obj_rels[this.rels[i].key]);
		this.rels[i].other_sel.forEachFeature(fn);
	}
}

Selector.prototype.forEachMatcher = function(fn) {
	var i;
	for (i=0; i<this.obj_attrs.length; i++) fn(this.obj_attrs[i]);
	for (i=0; i<this.grp_attrs.length; i++) fn(this.grp_attrs[i]);
	for (i=0; i<this.rels.length; i++) fn(this.rels[i]);
}

Selector.prototype.countNegations = function() {
	var c = 0;
	this.forEachMatcher(function(m) { c += m.countNegations() });
	return c;
}

/** Returns the first group in the passed scene that contains this selector in
 * its selectors array. Null if none. */
Selector.prototype.getCachedResult = function(scene) {
	for (var i=0; i<this.cached_results.length; i++) {
		var g = this.cached_results[i];
		if (g.scene_node === scene) return g;
	}
	return null;
	// for (var i=0; i<scene.groups.length; i++) {
  //    var g = scene.groups[i];
  //    if (g.selectors.indexOf(this) !== -1) return g;
  //  }
  //return null;
}

/** Will return a cached result if it exists. If not, it will apply the selector
 * to the scene. If there is a group in the scene that contains the same objects
 * as selected by this selector, it will return that group, otherwise the newly
 * created group, after adding it to the scene. */
Selector.prototype.applyToScene = function(scene) {
	var sel = this, group;
	group = this.getCachedResult(scene);
	if (group) return group;
	// we did not apply this selector to this scene yet
	var all_group = scene.groups[0] || GroupNode.sceneGroup(scene);
	if (all_group.objs.length !== scene.objs.length)
	  throw "1st group in each scene should be the all-group";
	group = this.select(all_group, scene);
	group.selectors = [this];
	if (!group.empty()) {
		for (var i=0; i<scene.groups.length; i++) {
			var g = scene.groups[i];
    	if (this.arraysIdentical(g.objs, group.objs)) {
      	if (g.selectors.some(function(ssel) { return ssel.equals(sel) })) {
        	throw "I won't insert an existing selector";
      	}
      	g.selectors.push(sel);
      	sel.cached_results.push(g);
      	return g;
    	}
  	}
  	// a new group!
  	scene.groups.push(group);
  	sel.cached_results.push(group);
	}
	return group;
}

Selector.prototype.hasFeatureType = function(klass) {
	var res = false;
	this.forEachFeature(function(f) {
		if (f.prototype === klass) res = true
	});
	return res;
}

/** Returns a new selector that has all attributes from this and the passed selector.
 * In the case of a duplicate feature, the feature of the passed selector is used. */
Selector.prototype.mergedWith = function(other_sel) {
	var sel = new Selector();
	var add_attr = function(attr) { sel.add_attr(attr) };
	var add_rel = function(rel) { sel.add_rel(rel) };

	this.obj_attrs.forEach(add_attr);
	other_sel.obj_attrs.forEach(add_attr);
	this.grp_attrs.forEach(add_attr);
	other_sel.grp_attrs.forEach(add_attr);
	this.rels.forEach(add_rel);
	other_sel.rels.forEach(add_rel);

	return sel;
}

Selector.prototype.clone = function() {
	var sel = new Selector(this.unique);
	var add_attr = function(attr) { sel.add_attr(attr) };
	var add_rel = function(rel) { sel.add_rel(rel) };
	this.obj_attrs.forEach(add_attr);
	this.grp_attrs.forEach(add_attr);
	this.rels.forEach(add_rel);
	return sel;
}

/// Will extract the attribute's key, label, activation and constant property. Pass the time
/// at which the attribute values should match (default: 'start').
Selector.prototype.use_attr = function(attr, time) {
	this.add_attr(Selector.AttrMatcher.fromAttribute(attr, time));
	return this;
};

/// Adds the passed AttrMatcher. Will replace if an attr with the same key and
/// time is in the list already.
Selector.prototype.add_attr = function(attr_matcher) {
	var attrs = (attr_matcher.type === 'group') ? this.grp_attrs : this.obj_attrs;
	// if we have an attr of same type, replace
	for (var i=0; i<attrs.length; i++) {
		var attr = attrs[i];
	  if (attr.key === attr_matcher.key
	     && attr.time === attr_matcher.time
	  	 && attr.type === attr.type) {
	  	attrs[i] = attr_matcher;
	  	return this;
	  }
	}
	// its new, add to list
	attrs.push(attr_matcher);
	return this;
};

/// Will extract the relation key, label, activation, constant and symmetry properties. Pass the time
/// at which the attribute values should match (default: 'start'). Pass a selector that selects the other
/// object.
Selector.prototype.use_rel = function(other_sel, rel, time) {
	this.add_rel(Selector.RelMatcher.fromRelationship(other_sel, rel, time));
	return this;
};

/// Adds the passed RelMatcher. Will replace if a rel with the same key, target object
/// and time is in the list already.
Selector.prototype.add_rel = function(rel_matcher) {
	// if we have an attr of same type, replace
	for (var i=0; i<this.rels.length; i++) {
		var rel = this.rels[i];
	  if (rel.key === rel_matcher.key && rel.time == rel_matcher.time &&
	  	  rel.other_sel.equals(rel_matcher.other_sel)) {
	  	this.rels[i] = rel_matcher;
	  	return this;
	  }
	}
	// its new, add to list
	this.rels.push(rel_matcher);
	return this;
};

/// Returns true if the passed other selector has the same relationships and attributes.
/// They might be in a different order.
Selector.prototype.equals = function(other) {
	if (!other) return false;
	if (this === other) return true;
	if (this.obj_attrs.length !== other.obj_attrs.length) return false;
	if (this.grp_attrs.length !== other.grp_attrs.length) return false;
	if (this.rels.length !== other.rels.length) return false;
	var self = this;
	var differs = function(field) {
		return (!self[field].every(function (ours) {
			return other[field].some(function (theirs) {
		  	return ours.equals(theirs)
			})
		}))
	}
	if (differs('grp_attrs') || differs('obj_attrs') || differs('rels')) return false;
	return true;
}

/// Returns true if the passed object node matches the selector's object
/// attributes and relations. Optionally, an array of nodes that will be
/// condisered as relationship partners can be passed as second parameter. If
/// it isn't, all objects in the scene except `object` are used. If a test_fn
/// is passed, it is called for each node that matches the selector attributes
/// and only if the function returns true, the node is used. The relationships
/// of the selector are not used in this case.
Selector.prototype.matchesObject = function(object, others, test_fn) {
	var self = this;
	return this.obj_attrs.every(function (attr) {
		return attr.matches(object, self.thresholds[attr.key+'.object'])
	}) &&
    (test_fn ? test_fn(object) : this.rels.every(function (rel) {
    return rel.matches(object, others, self.thresholds[rel.key+'.object'])
  }));
};

/// Returns true if the passed group node matches the selector's group attributes.
Selector.prototype.matchesGroup = function(group) {
	var self = this;
	return this.grp_attrs.every(function (attr) {
	  return attr.matches(group, self.thresholds[attr.key+'.group'])
	});
};

/// Returns a group node. If a test_fn is passed, it is called for each object
/// node that matches the selector attributes and only if the function returns
/// true, the node is used. The relationships of the selector are not used in
/// this case.
Selector.prototype.select = function(group_node, scene_node, test_fn) {
	if (this.blank()) return group_node;

	var selector = this.mergedWith(group_node.selectors[0]);
	var gn = group_node.clone();
	var type = this.getType();
	var self = this;
	gn.selectors = [selector];
	// first apply object-level features
	if (type === 'mixed' || type === 'object') {
		var nodes = gn.objs
	  	.map(function (obj) { return obj.object_node })
	  	.filter(function (node) { return self.matchesObject(node, null, test_fn) })
	  	.map(function (on) { return on.obj });

	  // check whether a group with these nodes already exists in the scene
	  var gn2 = scene_node.getGroupByNodes(nodes);
	  if (gn2) {
	  	gn = gn2;
	  	gn.selectors.push(selector);
	  } else {
	  	gn = new GroupNode(scene_node, nodes, selector);
	  }
	}
	// then apply group-level features
	if (type === 'mixed' || type === 'group') {
		if (!this.matchesGroup(gn)) gn = new GroupNode(scene_node, [], selector);
	}
	return gn;
};

/// Returns a human readable description of the attributes used in this selector.
Selector.prototype.describe = function() {
	var threshs = this.thresholds;
	var descr = function(feature) { return feature.describe(threshs[feature.key+'.'+feature.type]) }

	if (this.blank()) return (this.unique ? '[the object]' : '(any object)');
	var attrs = this.obj_attrs.map(descr).join(" and ");
	var grp_attrs = this.grp_attrs.map(descr);
	var rels = this.rels.map(descr);
	rels = rels.concat(grp_attrs).join(" and ");

	if (this.unique) return '[the ' + attrs + ' object' + (rels === '' ? '' : ' that is ' + rels) + ']';
	return '(' + attrs + ' objects' + (rels === '' ? '' : ' that are ' + rels) + ')';
};

Selector.prototype.describe2 = function(omit_mode) {
	if (this.blank()) {
	 	if (omit_mode) return '*';
	 	return (this.unique ? 'there is exactly one object' : 'any object');
	}
	var attrs = this.obj_attrs.map(function (attr) { return attr.describe() });
	var grp_attrs = this.grp_attrs.map(function (attr) { return attr.describe() }).join(" and ");
	var rels = this.rels.map(function (rel) { return rel.describe() });
	var res = attrs.concat(rels).concat(grp_attrs).join(" and ");
	if (omit_mode) {
	 	if (this.unique) return '[that is ' + res + ']';
	 	else return '[that are ' + res + ']';
	} else {
	 	if (this.unique) return '[exactly one object is ' + res + ']';
	 	else return '(objects that are ' + res + ')';
	}
};



Selector.AttrMatcher = function(key, label, active, time, type) {
	this.key = key;
	this.label = label;
	this.active = typeof(active) === 'undefined' ? true : active;
	if (key in pbpSettings.obj_attrs) {
		this.type = "object";
		this.constant = pbpSettings.obj_attrs[key].prototype.constant;
		this.base_level = pbpSettings.obj_attrs[key].prototype.base_level;
	} else {
		this.type = "group";
		this.constant = pbpSettings.group_attrs[key].prototype.constant;
		this.base_level = pbpSettings.group_attrs[key].prototype.base_level;
	}
	this.time = time || 'start';
}

Selector.AttrMatcher.prototype.clone = function() {
	return new Selector.AttrMatcher( this.key, this.label, this.active
		                             , this.time, this.type);
}

/// Will extract the attribute's key, label, activation and constant property. Pass the time
/// at which the attribute values should match (default: 'start').
Selector.AttrMatcher.fromAttribute = function(attr, time) {
	return new Selector.AttrMatcher(
		attr.key, attr.get_label()
	 ,attr.get_activity() >= pbpSettings.activation_threshold
	 ,time);
}

Selector.AttrMatcher.prototype.getComplexity = function() {
	var c = this.base_level ? 0.5 : 1;
	if (this.time !== 'start') c++;
	return c;
}

Selector.AttrMatcher.prototype.countNegations = function() {
	return this.active ? 0 : 1;
}

/// Returns true if the other AttrMatcher is the same as this one.
Selector.AttrMatcher.prototype.equals = function(other) {
	return (this.key === other.key && this.label === other.label &&
	        this.active === other.active && this.time === other.time);
}

/// Returns true if the passed node can supply the attribute and its activation and
/// label match.
Selector.AttrMatcher.prototype.matches = function(node, threshold) {
	var attr = node.getAttr(this.key, {time: this.time});
	if (!attr) return false;
	//console.log(this.key,'has activity',attr.get_activity());
	var active = attr.get_activity() >= (threshold || pbpSettings.activation_threshold);
	return (active == this.active && attr.get_label() == this.label);
}

Selector.AttrMatcher.prototype.describe = function(threshold) {
	return (this.active ? '' : 'not ') + this.label +
				 (threshold ? '['+threshold.toFixed(2)+']' : '') +
				 (this.constant || this.time == "start" ? '' : ' at the ' + this.time);
}

/// CAUTION: other_sel is not allowed to use RelMatchers, itself! Otherwise
/// we could get into infinite recursion!
Selector.RelMatcher = function(other_sel, key, label, active, time) {
	this.other_sel = other_sel;
	this.key = key;
	this.label = label;
	this.active = typeof(active) === 'undefined' ? true : active;
	this.constant = pbpSettings.obj_rels[key].prototype.constant;
	this.symmetric = pbpSettings.obj_rels[key].prototype.symmetric;
	this.time = time || 'start';
}

Selector.RelMatcher.prototype.clone = function() {
	return new Selector.RelMatcher( this.other_sel, this.key, this.label
		                            , this.active, this.time);
}

Selector.RelMatcher.prototype.getComplexity = function() {
	var c = 1;
	if (this.time !== 'start') c++;
	c += this.other_sel.getComplexity();
	return c;
}

Selector.RelMatcher.prototype.countNegations = function() {
	return (this.active ? 0 : 1) + this.other_sel.countNegations();
}

/// Returns true if the other RelMatcher is the same as this one.
Selector.RelMatcher.prototype.equals = function(other) {
	return (this.key === other.key && this.label === other.label &&
	        this.active === other.active && this.time === other.time &&
	        this.other_sel.equals(other.other_sel));
}

/// First uses its 'other' selector on the passed 'others' array of nodes. Returns true
/// if the passed 'node' can supply the relationship to any of the selected nodes and
/// the activation and label match.
/// If others is not passed, all nodes in the scene except the 'node' are used.
Selector.RelMatcher.prototype.matches = function(node, others, threshold) {
	if (this.other_sel.rels.length > 0) throw "the other-selector of"
	// select all other nodes in the scene as 'others', if they were not passed
	others = others || node.scene_node.objs.filter(function (on) { return on !== node });

	var self = this;

	var test_fn = function(other) {
		if (other === node) return false;
		var rel = node.getRel(self.key, {other: other, time: self.time});
		if (!rel) return false;
	  var active = rel.get_activity() >= (threshold || pbpSettings.activation_threshold);
		return (active == self.active && rel.get_label() == self.label);
	}

	var match_fn = function(other) {
		return self.other_sel.matchesObject(other, null, test_fn);
	}

	var matching_others = others.filter(match_fn);

	if (!this.active) return matching_others.length === others.length;
	if (this.other_sel.unique && matching_others.length != 1) return false;
	return matching_others.length > 0;
}

/// Will extract the relation key, label, activation, constant and symmetry properties. Pass the time
/// at which the attribute values should match (default: 'start'). Pass a selector that selects the other
/// object.
Selector.RelMatcher.fromRelationship = function(other, rel, time) {
	return new Selector.RelMatcher(
		other, rel.key, rel.get_label()
	 ,rel.get_activity() >= pbpSettings.activation_threshold
	 ,time);
}

Selector.RelMatcher.prototype.describe = function(threshold) {
	return (this.active ? '' : 'not ') + this.label +
				 (threshold ? '['+threshold.toFixed(2)+']' : '') + " " +
				 this.other_sel.describe() +
				 (this.constant || this.time == "start" ? '' : ' at the ' + this.time);
}

Selector.prototype.arraysIdentical = function(a1, a2) {
  if (a1.length !== a2.length) return false;
  for (var i=0; i<a1.length; i++) {
    if (a2.indexOf(a1[i]) === -1) return false;
  }
  return true;
}

