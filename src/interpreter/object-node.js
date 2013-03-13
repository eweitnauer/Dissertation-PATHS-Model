/// An ObjectNode represents a single object.
ObjectNode = function() {
	this.obj = null;
	this.states = {};
}

ObjectNode.attrs = {
  'hpos':  HorizontalPositionAttribute
 ,'vpos': VerticalPositionAttribute
 ,'shape': ShapeAttribute
 ,'stability': StabilityAttribute
};

ObjectNode.rels = {
  'above': AboveRelationship
 ,'below': BelowRelationship
 ,'right': RightRelationship
 ,'left': LeftRelationship
 ,'beside': BesideRelationship
 ,'distance': DistanceRelationship
 ,'ontop': OnTopRelationship
 ,'touch': TouchRelationship
};

ObjectNode.perceive = function(state, obj, others) {
	var on = new ObjectNode();
	return on.perceive(state, obj, others);
}

/// Returns an ObjectNode instance, which is the perception of the passed shape.
ObjectNode.prototype.perceive = function(state, obj, others) {
  this.obj = obj;
  this.states[state] = {};
  for (var a in ObjectNode.attrs) {
    this.states[state][a] = ObjectNode.attrs[a].perceive(obj);
  }
  for (var r in ObjectNode.rels) {
  	this.states[state][r] = [];
  	for (var i=0; i<others.length; i++) {
  		if (others[i] == obj) continue;
  		this.states[state][r].push(ObjectNode.rels[r].perceive(obj, others[i]));
  	}
  }
  return this;
}