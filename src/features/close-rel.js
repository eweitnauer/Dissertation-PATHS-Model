CloseRelationship = function(obj, other) {
  this.perceive(obj, other);
}
CloseRelationship.prototype.key = "close";
CloseRelationship.prototype.arity = 2;
CloseRelationship.prototype.symmetric = true;
CloseRelationship.prototype.constant = false;

// Input this at google: plot 1/(1+exp(20*(0.35-x/100))) from -10 to 110, 1-1/(1+exp(30*(0.2-x/100)))
CloseRelationship.membership = function(dist) {
  var a_close = 30; // steepness of sigmoid function
  var m_close = 0.2; // distance at which sigmoid is 0.5 (on scale 0...1)
  var size = 100; // scene width and height
  return 1-1/(1+Math.exp(a_close*(m_close-dist/size)));
}

CloseRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  // if both objects are in the same scene, use the physics engine to get
  // the minimum distance between their surfaces
  if (obj.object_node.scene_node === other.object_node.scene_node) {
    this.val = obj.phys_obj.distance(other.phys_obj) / obj.phys_scale;
  }
  /// if the objects are from different scenes, simply compare the distance
  /// of their positions
  else {
    // a bit of scaling to be more permissive
    this.val = Point.len(obj.x-other.x, obj.y-other.y)*2/3;
  }
}

CloseRelationship.prototype.get_activity = function() {
  return CloseRelationship.membership(this.val);
}

CloseRelationship.prototype.get_label = function() {
  return 'close';
}