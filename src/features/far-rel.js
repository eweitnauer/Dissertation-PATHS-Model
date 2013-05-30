FarRelationship = function(obj, other) {
  this.perceive(obj, other);
}
FarRelationship.prototype.key = "far";
FarRelationship.prototype.arity = 2;
FarRelationship.prototype.symmetric = true;
FarRelationship.prototype.constant = false;

// Input this at google: plot 1/(1+exp(20*(0.35-x/100))) from -10 to 110, 1-1/(1+exp(30*(0.2-x/100)))
FarRelationship.membership = function(dist) {
  var a_far = 20; // steepness of sigmoid function
  var m_far = 0.35; // distance at which sigmoid is 0.5 (on scale 0...1)
  var size = 100; // scene width and height
  return 1/(1+Math.exp(a_far*(m_far-dist/size)));
}

FarRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  this.val = obj.phys_obj.distance(other.phys_obj) / obj.phys_scale;
}

FarRelationship.prototype.get_activity = function() {
  return FarRelationship.membership(this.val);
}

FarRelationship.prototype.get_label = function() {
  return 'far';
}