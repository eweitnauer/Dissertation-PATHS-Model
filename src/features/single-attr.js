/// Reflects whether an object is moving at the moment or will be moving 0.1 seconds
/// in the future. The activation is 0.5 for a linear velocity of 0.1.
SingleAttribute = function(obj) {
  this.perceive(obj);
}
SingleAttribute.prototype.key = 'single';
SingleAttribute.prototype.targetType = 'obj';
SingleAttribute.prototype.arity = 1;
SingleAttribute.prototype.constant = false;

// Input this at google: plot 1/(1+exp(30*(0.05-x/100))) from -10 to 110
SingleAttribute.membership = function(dist) {
  var a_far = 40; // steepness of sigmoid function
  var m_far = 0.03; // distance at which sigmoid is 0.5 (on scale 0...1)
  var size = 100; // scene width and height
  return 1/(1+Math.exp(a_far*(m_far-dist/size)));
}

SingleAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  var other = obj.object_node.scene_node.oracle.getClosestBodyWithDist(obj.phys_obj);
  if (!other) this.val = 100; // no other objects!
  else this.val = other.dist / obj.phys_scale;
}

SingleAttribute.prototype.get_activity = function() {
  return Math.max(0, SingleAttribute.membership(this.val)
                   - TouchRelationship.membership(this.val));
}

SingleAttribute.prototype.get_label = function() {
  return 'single';
}
