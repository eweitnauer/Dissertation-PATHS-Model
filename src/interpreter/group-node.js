/// Copyright by Erik Weitnauer, 2013.

/// A GroupNode represents a group of objects in one scene. Pass the SceneNode the
/// group belongs to.
GroupNode = function(scene_node, objs) {
  this.scene_node = scene_node;
  this.objs = objs || [];   // shapes
  this.states = {};
}

/// Creates and returns a single GroupNode of all objects of a scene. If the key_obj
/// parameter is passed, the key_obj is not included in the group.
GroupNode.groupAll = function(scene_node, key_obj) {
	var g = new GroupNode(scene_node);
  for (var i=0; i<scene_node.parts.length; i++) {
    var on = scene_node.parts[i];
    if (on != key_obj && on instanceof SceneNode) g.objs.push(on.obj);
  }
  return g;
}

/// Creates a GroupNodes for each set of spatially close objects in the scene
/// that has more than one object.
GroupNode.groupSpatial = function(scene_node, max_dist) {
  var gns = [];
  if (typeof(max_dist) === 'undefined') max_dist = 0.06;
  var g = new GroupNode(scene_node);
  var sg = scene_node.oracle.getSpatialGroups(max_dist);
  for (var i=0; i<sg.length; i++) {
    if (sg[i].length > 0) gns.push(new GroupNode(scene_node, sg[i].map(function (body) { return body.master_obj.obj })))
  }
  return gns;
}

/// list of all possible group attributes
GroupNode.attrs = pbpSettings.attrs;

/// list of all possible object relations
GroupNode.rels = pbpSettings.rels;

/// Perceives all attributes and all relations to all other parts in the scene
/// at the current situation and saves the results under the passed state name.
GroupNode.prototype.perceive = function(state) {
  var res = {};
  for (var a in GroupNode.attrs) {
    var attr = GroupNode.attrs[a];
    if (attr.forGroup) res[a] = attr.forGroup(this.objs, this.scene_node);
  }
  for (var r in GroupNode.rels) {
    res[r] = [];
    var rel = GroupNode.rels[r];
    var parts = this.scene_node.parts;
    for (var i=0; i<parts.length; i++) {
      if (parts[i] == this) continue;
      if (parts[i] instanceof GroupNode) {
        if (rel.GroupToGroup) res[r].push(rel.GroupToGroup(this.objs, parts[i].objs, this.scene_node));
      } else if (parts[i] instanceof ObjectNode) {
        if (rel.GroupToObject) res[r].push(rel.GroupToObject(this.objs, parts[i].obj, this.scene_node));
      }
    }
    if (res[r].length == 0) delete res[r];
  }
  this.states[state] = res;
}

/// Prints a description of the active attribute and relationship labels for the group
/// in each state.
GroupNode.prototype.describe = function() {
  console.log(this);
}