/// Object beeing above to other object on a scale from 1 (very) to 0 (not at all).
AboveRelationship = function(obj, other) {
  this.name = "above";
  this.arity = 2;
  this.symmetry = false;
  this.constant = false;
  this.obj = obj;
  this.other = other;
  this.val = '?';
}

/// Returns the delta angle to "above", given dx and dy of two points.
AboveRelationship.delta_angle = function(dx, dy) {
  if (dx == 0 && dy == 0) return 0;
  else return Math.acos(-dy/Math.sqrt(dx*dx+dy*dy)); // arccos([dx, dy] * [0, -1] / ||dx,dy||)
}

AboveRelationship.membership_fun = function(d_angle) {
  return Math.max(0, 1-2*d_angle/Math.PI);
}

AboveRelationship.perceive = function(obj, other) {
  var attr = new AboveRelationship(obj, other);
  attr.val = AboveRelationship.membership_fun(
             AboveRelationship.delta_angle(obj.x-other.x, obj.y-other.y));
  return attr;
}

AboveRelationship.get_label = function() {
  return ['above', this.val];
}