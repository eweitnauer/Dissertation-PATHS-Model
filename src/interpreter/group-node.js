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

/// The GroupNode will send 'perceived' and 'retrieved' events
/// {percept, target, other, time}.
GroupNode.events = d3.dispatch('perceived', 'retrieved');

GroupNode.prototype.empty = function() {
  return this.objs.length === 0;
}

GroupNode.prototype.addSelector = function(new_sel) {
  if (this.selectors.some(function(sel) { return new_sel.equals(sel) })) {
    var dublicate = this.selectors.filter(function(sel) { return new_sel.equals(sel) })[0];
    console.warn("Not inserting duplicate selector.");
    console.warn("New selector: '" + new_sel.describe() + "' from solution ", new_sel.solution.describe());
    console.warn("Old selector: '" + dublicate.describe() + "' from solution", dublicate.solution.describe());
    throw 'xxx';
  }
  this.selectors.push(new_sel);
};

/// Returns a clone with the same scene node, a copy of the objs array.
/// CAUTION: The times field that holds all cached percepts is the same
/// reference as in the original group node!
GroupNode.prototype.clone = function() {
  var gn = new GroupNode(this.scene_node, this.objs.slice(), this.selectors);
  gn.times = this.times;
  return gn;
}

/// Creates and returns a single GroupNode of all objects of a scene. If a blank selector
/// is passed, it is used as selector for the new group node.
GroupNode.sceneGroup = function(scene_node, sel) {
  if (!sel.blank()) throw "Selector must be blank, but is " + sel.describe() + "!";
  var objs = scene_node.objs.map(function(on) { return on.obj});
	return new GroupNode(scene_node, objs, sel);
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
/// Results will not be cached if 'dont_cache' is ture in opts.
GroupNode.prototype.getAttr = function(key, opts) {
  var o = PBP.extend({}, opts);
  // if time was not passed, use the current state of the oracle
  if (!o.time) o.time = this.scene_node.oracle.curr_state;
  if (GroupNode.attrs[key].constant) o.time = 'start';
  // if the attr is cached, just return it
  if ((o.time in this.times) && (key in this.times[o.time])) {
    var res = this.times[o.time][key];
    if (o.deliberate_only && !res.deliberate) return false;
    if (o.set_deliberate) res.deliberate = true;
    GroupNode.events.retrieved({ percept: res, target: this, time: o.time
                               , deliberate: o.set_deliberate });
    return res;
  }
  if (o.cache_only || o.deliberate_only) return false;
  // otherwise, goto the state and perceive it
  if (o.time) this.scene_node.oracle.gotoState(o.time);
  var res = new GroupNode.attrs[key](this);
  // cache it, if the state is a known one
  if (o.time && !o.dont_cache) {
    if (!this.times[o.time]) this.times[o.time] = {};
    this.times[o.time][key] = res;
    ActivityRanges.update(res, o.time);
  }
  if (o.set_deliberate) res.deliberate = true;
  GroupNode.events.perceived({ percept: res, target: this, time: o.time
                             , deliberate: o.set_deliberate
                             , only_checking : o.deliberate_only || o.cache_only });
  return res;
}

GroupNode.prototype.getDeliberately = function(key, opts) {
  opts = opts || {};
  opts.set_deliberate = true;
  return this.getAttr(key, opts);
}

GroupNode.prototype.getDeliberateOnly = function(key, opts) {
  opts = opts || {};
  opts.deliberate_only = true;
  return this.getAttr(key, opts);
}

GroupNode.prototype.get = GroupNode.prototype.getAttr;

/// Prints a description of the GroupNode.
GroupNode.prototype.describe = function() {
  console.log(this);
}
