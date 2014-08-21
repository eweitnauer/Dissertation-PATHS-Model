// Copyright 2014, Erik Weitnauer.

/** The Selector is used to focus on a subset of objects in a scene based on
 * a number of attributes and relations that must be fullfilled.
 * The selector can either have group or object attributes & relationships.
 * For obj. attrs, select() collects all matching objects inside a new group.
 * For group attrs, select() will return the whole group if it matches or
 * an empty group if it does not match.
 * The selector can be in unique mode, which means that result groups with more
 * than one element are returned as empty groups instead. */

 // FIXME: unique is not doing what is described above. Instead, it is only
 // used in the RelMatcher to decide whether to match all or exactly one of the
 // things we relate to.
var Selector = function(unique) {
	this.attrs = [];	      // object & group attributes
	this.rels = [];         // object relationships
	this.unique = !!unique;
	this.type = '';         // can be '', 'object' or 'group'
}

/// Returns true if the selector matches anything
Selector.prototype.blank = function() {
	return this.attrs.length == 0 && this.rels.length == 0;
}

Selector.prototype.hasRelationships = function() {
	return this.rels.length > 0;
}

/// The blank selector will match any type. Types can be 'object' or 'group'.
Selector.prototype.isOfType = function(type) {
	return (this.blank() || type == this.type);
}

/// Will extract the attribute's key, label, activation and constant property. Pass the time
/// at which the attribute values should match (default: 'start').
Selector.prototype.use_attr = function(attr, time) {
	this.add_attr(Selector.AttrMatcher.fromAttribute(attr, time));
	return this;
};

/// Adds the passed AttrMatcher. Will replace if an attr with the same key and time is in the list already.
Selector.prototype.add_attr = function(attr_matcher) {
	// check for constraint: either group or object attributes
	if (this.blank()) this.type = '';
	if (this.type && this.type != attr_matcher.type) {
		throw "can't combine group and objects attrs in a single selector.";
	}
	this.type = attr_matcher.type;
	// if we have an attr of same type, replace
	for (var i=0; i<this.attrs.length; i++) {
		var attr = this.attrs[i];
	  if (attr.key === attr_matcher.key && attr.time === attr_matcher.time
	  	 && attr.type === attr.type) {
	  	this.attrs[i] = attr_matcher;
	  	return this;
	  }
	}
	// its new, add to list
	this.attrs.push(attr_matcher);
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
	// check for constraint: either group or object attributes
	if (this.blank()) this.type = '';
	if (this.type == 'group') {
		throw "can't combine group and objects attrs in a single selector.";
	}
	this.type = 'object';

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
	if (this.attrs.length !== other.attrs.length) return false;
	if (this.rels.length !== other.rels.length) return false;
	if (!this.attrs.every(function (this_attr) {
		return other.attrs.some(function (other_attr) {
		  return this_attr.equals(other_attr)
		})
	})) return false;
	if (!this.rels.every(function (this_rel) {
		return other.rels.some(function (other_rel) {
		  return this_rel.equals(other_rel)
		})
	})) return false;
	return true;
}

/// Returns true if the passed object node matches the selectors attributes and relations.
/// Optionally, an array of nodes that will be condisered as relationship partners can be
/// passed as second parameter. If it isn't, all objects in the scene except `on` are used.
/// If the selector has no attributes or relationships, every object matches.
/// If a test_fn is passed, it is called for each node that matches the selector
/// attributes and only if the function returns true, the node is used. The relationships
/// of the selector are not used in this case.
Selector.prototype.matches = function(on, others, test_fn) {
	return this.attrs.every(function (attr) { return attr.matches(on) }) &&
				 (test_fn ? test_fn(on)
				 	        : this.rels.every(function (rel) { return rel.matches(on, others) }));
};

/// Returns an array with the matching object or group nodes, depending on the mode.
/// - all ... selects all matching nodes
/// If a test_fn is passed, it is called for each node that matches the selector
/// attributes and only if the function returns true, the node is used. The relationships
/// of the selector are not used in this case.
Selector.prototype.select = function(group_node, scene_node, test_fn) {
	var res = [], self = this;
	var selectors = group_node.selectors.concat([this]);
	if (this.type == 'group') {
		if (this.matches(group_node)) {
			var gn = group_node.clone();
			gn.selectors = selectors;
			return gn;
		}
		else return new GroupNode(scene_node, [], selectors);
	}
	// 'object' type or blank
	if (this.blank()) return group_node;

	var nodes = group_node.objs
	  .map(function (obj) { return obj.object_node })
	  .filter(function (node) { return self.matches(node, null, test_fn) })
	  .map(function (on) { return on.obj });

	var gn = new GroupNode(scene_node, nodes, selectors);
	return gn;
};

Selector.prototype.applyToScene = function(scene) {
	return this.select(GroupNode.sceneGroup(scene), scene);
}

/// Returns a human readable description of the attributes used in this selector.
Selector.prototype.describe = function() {
	if (this.blank()) return (this.unique ? '[the object]' : '(any object)');
	var attrs = this.attrs.map(function (attr) { return attr.describe() }).join(" and ");
	if (attrs != '') attrs = ' ' + attrs;
	var rels = this.rels.map(function (rel) { return rel.describe() }).join(" and ");
	if (this.type == 'group') {
		return '(all objects are' + attrs + ')';
	}	else {
		if (this.unique) return '[the' + attrs + ' object' + (rels == '' ? '' : ' that is ' + rels) + ']';
		return '(all' + attrs + ' objects' + (rels == '' ? '' : ' that are ' + rels) + ')';
	}
};

Selector.prototype.describe2 = function(omit_mode) {
	if (this.blank()) {
		if (omit_mode) return '*';
		return (this.unique ? 'there is exactly one object' : 'any object');
	}
	var attrs = this.attrs.map(function (attr) { return attr.describe() });
	var rels = this.rels.map(function (rel) { return rel.describe() });
	var res = attrs.concat(rels).join(" and ");
	if (omit_mode) {
		if (this.unique) return '[that is ' + res + ']';
		else return '[that are ' + res + ']';
	} else {
		if (this.unique) return '[exactly one object is ' + res + ']';
		else return '(all objects are ' + res + ')';
	}
};



Selector.AttrMatcher = function(key, label, active, time, type) {
	this.key = key;
	this.label = label;
	this.active = typeof(active) === 'undefined' ? true : active;
	if (key in pbpSettings.obj_attrs) {
		this.type = "object";
		this.constant = pbpSettings.obj_attrs[key].prototype.constant;
	} else {
		this.type = "group";
		this.constant = pbpSettings.group_attrs[key].prototype.constant;
	}
	this.time = time || 'start';
}

/// Will extract the attribute's key, label, activation and constant property. Pass the time
/// at which the attribute values should match (default: 'start').
Selector.AttrMatcher.fromAttribute = function(attr, time) {
	return new Selector.AttrMatcher(
		attr.key, attr.get_label()
	 ,attr.get_activity() >= pbpSettings.activation_threshold
	 ,time);
}

/// Returns true if the other AttrMatcher is the same as this one.
Selector.AttrMatcher.prototype.equals = function(other) {
	return (this.key === other.key && this.label === other.label &&
	        this.active === other.active && this.time === other.time);
}

/// Returns true if the passed node can supply the attribute and its activation and
/// label match.
Selector.AttrMatcher.prototype.matches = function(node) {
	var attr = node.getAttr(this.key, {time: this.time});
	if (!attr) return false;
	//console.log(this.key,'has activity',attr.get_activity());
	var active = attr.get_activity() >= pbpSettings.activation_threshold;
	return (active == this.active && attr.get_label() == this.label);
}

Selector.AttrMatcher.prototype.describe = function() {
	return (this.active ? '' : 'not ') + this.label +
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
Selector.RelMatcher.prototype.matches = function(node, others) {
	if (this.other_sel.rels.length > 0) throw "the other-selector of"
	// select all other nodes in the scene as 'others', if they were not passed
	others = others || node.scene_node.objs.filter(function (on) { return on !== node });

	var self = this;

	var test_fn = function(other) {
		if (other === node) return false;
		var rel = node.getRel(self.key, {other: other, time: self.time});
		if (!rel) return false;
	  var active = rel.get_activity() >= pbpSettings.activation_threshold;
		return (active == self.active && rel.get_label() == self.label);
	}

	var match_fn = function(other) {
		return self.other_sel.matches(other, null, test_fn);
	}

	var matching_others = others.filter(match_fn);

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

Selector.RelMatcher.prototype.describe = function() {
	return (this.active ? '' : 'not ') + this.label + " " +
				 this.other_sel.describe() +
				 (this.constant || this.time == "start" ? '' : ' at the ' + this.time);
}