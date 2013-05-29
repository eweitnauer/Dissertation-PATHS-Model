/// Copyright by Erik Weitnauer, 2012.

/// An ObjectNode represents a single object. Pass the object (shape) it represents
/// and the SceneNode it is part of.
ObjectNode = function(scene_node, obj) {
	this.obj = obj; obj.object_node = this;
  this.scene_node = scene_node;
	this.states = {};
}

/// list of all possible object attributes
ObjectNode.attrs = pbpSettings.attrs;

/// list of all possible object relations
ObjectNode.rels = pbpSettings.rels;

/// Perceives all object attributes and all relations to all other objects
/// in the scene at the current situation and saves the results under the
/// passed state name.
ObjectNode.prototype.perceive = function(state) {
  var res = {};
  for (var a in ObjectNode.attrs) {
    var attr = ObjectNode.attrs[a];
    res[a] = new attr(this.obj, this.scene_node);
  }
  for (var r in ObjectNode.rels) {
    var rel = ObjectNode.rels[r];
    res[r] = [];
    var parts = this.scene_node.parts;
    for (var i=0; i<parts.length; i++) {
      if (parts[i] == this) continue;
      if (typeof(GroupNode) != 'undefined' && parts[i] instanceof GroupNode) {
        if (rel.ObjectToGroup) res[r].push(rel.ObjectToGroup(this.obj, parts[i].objs, this.scene_node));
      } else if (parts[i] instanceof ObjectNode) {
        res[r].push(new rel(this.obj, parts[i].obj, this.scene_node));
      }
    }
    if (res[r].length == 0) delete res[r];
  }
  this.states[state] = res;
}

/// Returns a human readable description of the active attribute and relationship labels for
/// each object at each of the recorded times. If there are two times, 'start' and 'end', values
/// that don't change are summarized and shown first.
ObjectNode.prototype.describe = function(prefix) {
  prefix = prefix || '';
  var res = [prefix + 'Obj. ' + this.obj.id + ':'];
  var states = d3.keys(this.states);
  // special handling when just start and end state are known
  if (states.length == 2 && states.indexOf('start') != -1 && states.indexOf('end') != -1) {
    var both=[], start=[], end=[];
    for (var a in ObjectNode.attrs) {
      var attr0 = this.states.start[a], attr1 = this.states.end[a];
      if (!attr0 || !attr1) continue;
      var vals = [(attr0.get_activity() >= 0.5) ? attr0.get_label() : '',
                  (attr1.get_activity() >= 0.5) ? attr1.get_label() : ''];
      if (vals[0] == '' && vals[1] == '') continue;
      if (vals[0] == '') end.push(vals[1])
      else if (vals[1] == '') start.push(vals[0])
      else if (vals[0] == vals[1]) both.push(vals[0]);
      else both.push(vals[0] + "==>" + vals[1]);
    }
    for (var r in ObjectNode.rels) {
      var rels0 = this.states.start[r], rels1 = this.states.end[r];
      if (!rels0 || !rels1) continue;
      for (var i=0; i<rels0.length; i++) {
        if (!rels0[i] || !rels1[i]) continue;
        var vals = [(rels0[i].get_activity() >= 0.5) ? rels0[i].get_label() : '',
                    (rels1[i].get_activity() >= 0.5) ? rels1[i].get_label() : '']
        if (vals[0] == '' && vals[1] == '') continue;
        if (vals[0] == '') end.push(vals[1] + ' ' + rels1[i].other.id)
        else if (vals[1] == '') start.push(vals[0] + ' ' + rels0[i].other.id)
        else if (vals[0] == vals[1]) both.push(vals[0] + ' ' + rels0[i].other.id);
        else both.push(vals[0] + "==>" + vals[1] + ' ' + rels0[i].other.id);
      }
    }
    res.push(prefix + '  ' + both.join(', ') + ' START: ' + start.join(', ') + ' END: ' + end.join(', '));
  } else {
    for (var state in this.states) res.push(prefix + this.describeState(state, '  '));
  }
  return res.join("\n");
}

/// Returns a human readable description of the passed time (see the `describe` method).
ObjectNode.prototype.describeState = function(time, prefix) {
  prefix = prefix || '';
  var out = [];
  for (var a in ObjectNode.attrs) {
    var attr = this.states[time][a];
    if (!attr) continue;
    if (attr.get_activity() >= 0.5) out.push(attr.get_label());
  }
  for (var r in ObjectNode.rels) {
    var rels = this.states[time][r];
    if (!rels) continue;
    for (var i=0; i<rels.length; i++) {
      if (!rels[i]) continue;
      if (rels[i].get_activity() >= 0.5) out.push(rels[i].get_label() + ' ' + rels[i].other.id);
    }
  }
  return prefix + time + ": " + out.join(', ');
};