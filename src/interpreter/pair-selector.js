// Copyright 2013, Erik Weitnauer.

/// A PairSelector is used to focus on a subset of object pairs including their relations
/// in a scene.
var PairSelector = function(sel1, sel2) {
	this.sel1 = sel1 || new ElementSelector();
	this.sel2 = sel2 || new ElementSelector();
	this.rels = [];
}

/// Will extract the relation key, label, activation, constant and symmetry properties. Pass the time
/// at which the attribute values should match (default: 'start').
PairSelector.prototype.use_rel = function(rel, time) {
	this.add_rel(rel.key, rel.get_label()
		          ,rel.get_activity() >= pbpSettings.activation_threshold
		          ,time);
};

/// Adds the passed relation description to the list of selector relations. If time is undefined,
/// it is set to 'start'.
PairSelector.prototype.add_rel = function(key, label, active, time) {
	if (typeof(active) === 'undefined') active = true;
	var constant  = pbpSettings.obj_rels[key].prototype.constant;
	var symmetric = pbpSettings.obj_rels[key].prototype.symmetric;
	this.rels.push({ key: key, rel: { label: label, active: active, constant: constant
		                               ,symmetric: symmetric, time: time || 'start' }});
};

/// Returns true if the passed object nodes matches the selector. If `only_check_rel`
/// is passed as true, the check whether the object selectors match on1 and on2 is omitted.
PairSelector.prototype.matches = function(on1, on2, only_check_rel) {
	var sn = on1.scene_node;
	// check whether object matches our attributes
	if (!only_check_rel && (!this.sel1.matches(on1) || !this.sel2.matches(on2))) return false;
	// check whether we can find a matching object for each relation
	return this.rels.every(function(e) {
		return on1.hasRelation(e.key, e.rel.time, e.rel.active, on2);
	});
}

/// Returns a hash with the first matching subject-object pair, or null if no pair matches.
/// Example: {sub: O1, obj: O2}
PairSelector.prototype.selectFirst = function(scene_node) {
	for (var i=0; i<scene_node.objs.length; i++) for (var j=0; j<scene_node.objs.length; j++) {
		var o1 = scene_node.objs[i], o2 = scene_node.objs[j];
		if (o1 === o2) continue;
		if (this.matches(o1, o2)) return { sub: o1, obj: o2 };
	}
	return null;
};

/// Returns an array of objects with all matching subject-object pairs.
/// Example: [{sub: O1, obj: O2}, {sub: O1, obj: O3}]
PairSelector.prototype.selectAll = function(scene_node) {
	var res = [];
	for (var i=0; i<scene_node.objs.length; i++) for (var j=0; j<scene_node.objs.length; j++) {
		var o1 = scene_node.objs[i], o2 = scene_node.objs[j];
		if (o1 === o2) continue;
		if (this.matches(o1, o2)) res.push({ sub: o1, obj: o2 });
	}
	return res;
};

/// Returns a hash with the matching subject and object if exactly one pair
/// matches and null otherwise.
PairSelector.prototype.selectThis = function(scene_node) {
	var res = this.selectAll(scene_node);
	if (res.length == 1) return res[0];
	else return null;
};

/// Returns a hash with the matching subject and object if exactly one object
/// matches the subject selector and exactly one object matches the object selector
/// and they both match the relations of the PairSelector. Otherwise returns null.
PairSelector.prototype.selectThisAndThis = function(scene_node) {
	var o1, o2;
	if ((o1 = this.sel1.selectThis(scene_node)) &&
	    (o2 = this.sel2.selectThis(scene_node)) &&
	    (this.matches(o1, o2, true))) return { sub: o1, obj: o2};
	else return null;
};

/// Returns a hash with the matching subject-object pair if the first selector
/// matches exactly one object and a second object can be found. Returns null otherwise.
PairSelector.prototype.selectThisAndFirst = function(scene_node) {
	var o1 = this.sel1.selectThis(scene_node);
	if (!o1) return null;
	for (var j=0; j<scene_node.objs.length; j++) {
		var o2 = scene_node.objs[j];
		if (o1 === o2) continue;
		if (this.sel2.matches(o2) && this.matches(o1, o2, true)) return { sub: o1, obj: o2 };
	}
	return null;
};

/// Returns an array of hashes with matching subject-object pairs, where the subject is the
/// only object that matches the first selector.
PairSelector.prototype.selectThisAndAll = function(scene_node) {
	var res = [], o1 = this.sel1.selectThis(scene_node);
	if (!o1) return [];
	for (var j=0; j<scene_node.objs.length; j++) {
		var o2 = scene_node.objs[j];
		if (o1 === o2) continue;
		if (this.sel2.matches(o2) && this.matches(o1, o2, true)) res.push({ sub: o1, obj: o2 });
	}
	return res;
};

/// Returns a hash with the matching subject-object pair if exactly one object
/// matches the subject selector and the group of the second selector has the
/// required relations with the subject. Returns null otherwise.
PairSelector.prototype.selectThisAndGroup = function(scene_node) {
	var o, g;
	if ((o = this.sel1.selectThis(scene_node)) &&
	    (g = this.sel2.selectGroup(scene_node)) &&
	    (this.matches(o, g, true))) return { sub: o, obj: g };
	else return null;
};

/// Returns a human readable description of the selector.
PairSelector.prototype.describe = function() {
	var rels = this.rels.map(function(e) {
		return (e.rel.constant || e.rel.time == 'start' ? '' : 'at the ' + e.rel.time + ' ') +
		       (e.rel.active ? '' : 'not ') + e.rel.label;
	});
	rels = rels.length==0 ? "in any relation to" : rels.join(" and ");
	return "[" + this.sel1.describe() + "] " + rels +
	       " [" + this.sel2.describe() + "]";
};