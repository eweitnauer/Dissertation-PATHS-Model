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
  this.val = obj.phys_obj.distance(other.phys_obj) / obj.phys_scale;
}

CloseRelationship.prototype.get_activity = function() {
  return CloseRelationship.membership(this.val);
}

CloseRelationship.prototype.get_label = function() {
  return 'close';
}