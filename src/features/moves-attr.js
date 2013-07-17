/// Reflects whether an object is moving at the moment or will be moving 0.1 seconds
/// in the future. The activation is 0.5 for a linear velocity of 0.1.
MovesAttribute = function(obj) {
  this.perceive(obj);
}
MovesAttribute.prototype.key = 'moves';
MovesAttribute.prototype.constant = true;

// google: "plot from -0.5 to 5, 1/(1+exp(20*(0.25-x)))"
MovesAttribute.membership = function(lin_vel) {
  var a = 20; // steepness of sigmoid function
  var m = 0.1; // linear velocity at which sigmoid is 0.5
  return 1/(1+Math.exp(a*(m-lin_vel)));
}

MovesAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  // vel. right now
  var body = obj.phys_obj;
  this.val = body.m_linearVelocity.Length();
  // vel. in 0.1 seconds
  obj.object_node.scene_node.oracle.analyzeFuture(0.1, null, (function() {
  	this.val_soon = body.m_linearVelocity.Length();
  }).bind(this));
}

MovesAttribute.prototype.get_activity = function() {
  return Math.max(MovesAttribute.membership(this.val), MovesAttribute.membership(this.val_soon));
}

MovesAttribute.prototype.get_label = function() {
  return 'moves';
}