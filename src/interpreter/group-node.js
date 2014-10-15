/// Copyright by Erik Weitnauer, 2013.

/// A GroupNode represents a group of objects in one scene. Pass the SceneNode the
/// group belongs to. Optionally, pass an selector array that was used to create the
/// group node.
GroupNode = function(scene_node, objs, selectors) {
  this.scene_node = scene_node;
  this.objs = objs || [];   // shapes
  this.times = {};
  // selectors that select this group node:
  this.selectors = selectors ? (Array.isArray(selectors) ? selectors.slice()
                                                         : [selectors])
                             : [new Selector()];
}

/// The ObjectNode will send 'perceived' and 'retrieved' events {feature, target}.
asEventListener.call(GroupNode.prototype);

GroupNode.prototype.empty = function() {
  return this.objs.length === 0;
}

/// Returns a clone with the same scene node, a copy of the objs array.
/// CAUTION: The times field that holds all cached percepts is the same
/// reference as in the original group node!
GroupNode.prototype.clone = function() {
  var gn = new GroupNode(this.scene_node, this.objs.slice(), this.selectors);
  gn.times = this.times;
  return gn;
}

/// Creates and returns a single GroupNode of all objects of a scene. If the key_obj
/// parameter is passed, the key_obj is not included in the group.
GroupNode.sceneGroup = function(scene_node, key_obj) {
	var g = new GroupNode(scene_node);
  for (var i=0; i<scene_node.objs.length; i++) {
    var on = scene_node.objs[i];
    if (on != key_obj && on instanceof ObjectNode) g.objs.push(on.obj);
  }
  return g;
}

/// Creates a GroupNodes for each set of spatially close objects in the scene
/// that has more than one object.
GroupNode.spatialGroups = function(scene_node, max_dist) {
  var gns = [];
  if (typeof(max_dist) === 'undefined') max_dist = 0.06;
  var sg = scene_node.oracle.getSpatialGroups(max_dist);
  for (var i=0; i<sg.length; i++) {
    if (sg[i].length > 0) gns.push(new GroupNode(scene_node, sg[i].map(function (body) { return body.master_obj.obj })))
  }
  return gns;
}

/// list of all possible group attributes
GroupNode.attrs = pbpSettings.group_attrs;

/// Perceives all attributes and all relations to all other objs in the scene
/// at the current situation and saves the results under the passed time.
GroupNode.prototype.perceive = function(time) {
  var res = {};
  for (var a in GroupNode.attrs) {
    var attr = GroupNode.attrs[a];
    res[a] = new attr(this);
  }
  this.times[time] = res;
}

/// Returns the attribute for the passed time in the opts object (default is 'start').
/// If it was not perceived yet, it is perceived now, unless 'cache_only' is true in opts.
GroupNode.prototype.getAttr = function(key, opts) {
  var o = PBP.extend({}, opts);
  // if time was not passed, use the current state of the oracle
  if (!o.time) o.time = this.scene_node.oracle.curr_state;
  if (GroupNode.attrs[key].constant) o.time = 'start';
  // if the attr is cached, just return it
  if ((o.time in this.times) && (key in this.times[o.time])) {
    var res = this.times[o.time][key];
    this.dispatchEvent('retrieved', {percept: res, target: this, time: o.time});
    return res;
  }
  if (o.cache_only) return false;
  // otherwise, goto the state and perceive it
  if (o.time) this.scene_node.oracle.gotoState(o.time);
  var res = new GroupNode.attrs[key](this);
  // cache it, if the state is a known one
  if (o.time) {
    if (!this.times[o.time]) this.times[o.time] = {};
    this.times[o.time][key] = res;
  }
  this.dispatchEvent('perceived', {percept: res, target: this, time: o.time});
  return res;
}

GroupNode.prototype.getFromCache = function(key, opts) {
  opts = opts || {};
  opts.cache_only = true;
  return this.getAttr(key, opts);
}

GroupNode.prototype.get = GroupNode.prototype.getAttr;

/// Prints a description of the GroupNode.
GroupNode.prototype.describe = function() {
  console.log(this);
}