// Copyright 2013, Erik Weitnauer.

/// A selector is used to focus on a subset of objects in a scene.
var Selector = function() {
	this.attrs = {};
}

/// Will extract the attributes name, activation and label. Pass the time
/// at which the attribute values should match (default: 'start').
Selector.prototype.add_attr = function(attr, time) {
	this.attrs[attr.name] = { label: attr.get_label()
	                         ,active: attr.get_activity() >= pbpSettings.activation_threshold
	                         ,time: time || 'start'
	                         ,constant: attr.constant };
};

/// Returns true if the passed object node matches the selector.
/// If the object does not have one of the selectors attributes set, it does not match.
Selector.prototype.matches = function(on) {
	return d3.entries(this.attrs).every(function(e){
		var attr = e.value;
		var obj_attr = on.times[attr.time][e.key];
		if (!obj_attr) return false;
		var obj_active = obj_attr.get_activity() >= pbpSettings.activation_threshold;
		return (obj_active == attr.active && obj_attr.get_label() == attr.label);
	});
};

/// Returns an array with all objects in the scene that match the selector.
Selector.prototype.select = function(scene_node) {
	return scene_node.objs.filter(this.matches.bind(this));
};

/// Returns a human readable description of the selector. If singular is passed
/// as true, the statment is done in sigular.
Selector.prototype.describe = function(singular) {
	if (this.attrs.length == 0) return singular ? 'an object' : 'any object';
	var res = d3.values(this.attrs).map(function(attr) {
		return attr.label + (attr.constant ? '' : ' at the ' + attr.time);
	});
	var last = res.pop();
	var pre = singular ? 'an object that is ' : 'objects that are ';
	if (res.length > 0)	return pre + res.join(', ') + ' and ' + last;
	else return pre + last;
};