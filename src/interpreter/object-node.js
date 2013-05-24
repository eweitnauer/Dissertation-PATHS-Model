/// Copyright by Erik Weitnauer, 2012.

/// An ObjectNode represents a single object. Pass the object (shape) it represents
/// and the SceneNode it is part of.
ObjectNode = function(scene_node, obj) {
	this.obj = obj; obj.object_node = this;
  this.scene_node = scene_node;
	this.states = {};
}

/// list of all possible object attributes
ObjectNode.attrs = {
  'left_pos': LeftAttribute
 ,'right_pos': RightAttribute
 ,'bottom_pos': BottomAttribute
 ,'top_pos': TopAttribute
 ,'on_ground': OnGroundAttribute
 ,'shape': ShapeAttribute
 ,'stability': StabilityAttribute
 ,'small': SmallAttribute
 ,'large': LargeAttribute
 ,'moves': MovesAttribute
};

/// list of all possible object relations
ObjectNode.rels = {
  'above': AboveRelationship
 ,'below': BelowRelationship
 ,'left': LeftRelationship
 ,'right': RightRelationship
 ,'beside': BesideRelationship
 ,'far': FarRelationship
 ,'close': CloseRelationship
 ,'ontop': OnTopRelationship
 ,'touch': TouchRelationship
};

/// Perceives all object attributes and all relations to all other objects
/// in the scene at the current situation and saves the results under the
/// passed state name.
ObjectNode.prototype.perceive = function(state) {
  var res = {};
  for (var a in ObjectNode.attrs) {
    res[a] = new ObjectNode.attrs[a](this.obj, this.scene_node);
  }
  for (var r in ObjectNode.rels) {
    res[r] = [];
    var ons = this.scene_node.parts;
    for (var i=0; i<ons.length; i++) {
      if (ons[i].obj == this.obj) continue;
      res[r].push(new ObjectNode.rels[r](this.obj, ons[i].obj, this.scene_node));
    }
  }
  this.states[state] = res;
}

/// Prints a description of the active attribute and relationship labels for each object
/// in each state. If there are two states, 'start' and 'end', values that don't change
/// are summarized and shown first.
ObjectNode.prototype.describe = function() {
  console.log('Object', this.obj.id, '=============');
  var states = d3.keys(this.states);
  // special handling when just start and end state are known
  if (states.length == 2 && states.indexOf('start') != -1 && states.indexOf('end') != -1) {
    var both=[], start=[], end=[];
    for (var a in ObjectNode.attrs) {
      var attr0 = this.states.start[a], attr1 = this.states.end[a];
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
      for (var i=0; i<rels0.length; i++) {
        var vals = [(rels0[i].get_activity() >= 0.5) ? rels0[i].get_label() : '',
                    (rels1[i].get_activity() >= 0.5) ? rels1[i].get_label() : '']
        if (vals[0] == '' && vals[1] == '') continue;
        if (vals[0] == '') end.push(vals[1] + ' ' + rels1[i].other.id)
        else if (vals[1] == '') start.push(vals[0] + ' ' + rels0[i].other.id)
        else if (vals[0] == vals[1]) both.push(vals[0] + ' ' + rels0[i].other.id);
        else both.push(vals[0] + "==>" + vals[1] + ' ' + rels0[i].other.id);
      }
    }
    console.log(both.join(', ') + ' START: ' + start.join(', ') + ' END: ' + end.join(', '));
  } else {
    for (var state in this.states) this.describeState(state);
  }
}

/// Prints the description of the passed state (see the `describe` method).
ObjectNode.prototype.describeState = function(state) {
  var out = [];
  for (var a in ObjectNode.attrs) {
    var attr = this.states[state][a];
    if (!('get_activity' in attr)) continue;
    if (attr.get_activity() >= 0.5) out.push(attr.get_label());
  }
  for (var r in ObjectNode.rels) {
    var rels = this.states[state][r];
    for (var i=0; i<rels.length; i++) {
      if (!('get_activity' in rels[i])) continue;
      if (rels[i].get_activity() >= 0.5) out.push(rels[i].get_label() + ' ' + rels[i].other.id);
    }
  }
  console.log(state + ": " + out.join(', '));
};