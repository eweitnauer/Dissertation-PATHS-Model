/// Copyright by Erik Weitnauer, 2013.

/// A GroupNode represents a group of objects in one scene. Pass the SceneNode the
/// group belongs to.
GroupNode = function(scene_node, objs) {
  this.scene_node = scene_node;
  this.objs = objs || [];   // shapes
  this.times = {};
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

/// Returns the attribute for the passed time (default is 'start'). If it was not
/// perceived yet, it is perceived now.
GroupNode.prototype.get = function(key, time) {
  time = time || 'start';
  if ((time in this.times) && (key in this.times[time])) return this.times[time][key];
  // need to perceive it
  this.scene_node.oracle.gotoState(time);
  if (!(time in this.times)) this.times[time] = {};
  return this.times[time][key] = new GroupNode.attrs[key](this);
}

/// Prints a description of the GroupNode.
GroupNode.prototype.describe = function() {
  console.log(this);
}