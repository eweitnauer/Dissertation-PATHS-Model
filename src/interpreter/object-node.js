/// Copyright by Erik Weitnauer, 2012.

/// An ObjectNode represents a single object.
ObjectNode = function(scene_node) {
	this.obj = null;
  this.scene_node = scene_node;
	this.states = {};
}

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

/// Returns an ObjectNode instance, which is the perception of the passed shape.
ObjectNode.prototype.perceive = function(state, obj, others) {
  this.obj = obj;
  obj.obj_node = this;
  this.states[state] = {};
  for (var a in ObjectNode.attrs) {
    this.states[state][a] = new ObjectNode.attrs[a](obj, this.scene_node);
  }
  for (var r in ObjectNode.rels) {
  	this.states[state][r] = [];
  	for (var i=0; i<others.length; i++) {
  		if (others[i] == obj) continue;
  		this.states[state][r].push(new ObjectNode.rels[r](obj, others[i], this.scene_node));
  	}
  }
  return this;
}

ObjectNode.prototype.describe = function() {
  console.log('Object', this.obj.id, '=============');
  for (var state in this.states) {
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
  }
}