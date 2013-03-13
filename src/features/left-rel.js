/// Object being left to other object on a scale from 1 (very) to 0 (not at all).
LeftRelationship = function() {
  this.type = "metric";
  this.name = "left-to";
  this.arity = 2;
  this.other = null;
  this.labels = ['left-of'];
  this.val = '?';
}

/// Returns the delta angle to "left", given dx and dy of two points.
LeftRelationship.delta_angle = function(dx, dy) {
  if (dx == 0 && dy == 0) return 0;
  else return Math.acos(-dx/Math.sqrt(dx*dx+dy*dy)); // arccos([dx, dy] * [-1, 0] / ||dx,dy||)
}

LeftRelationship.membership_fun = function(d_angle) {
  return Math.max(0, 1-2*d_angle/Math.PI);
}

LeftRelationship.perceive = function(obj, other) {
  var attr = new LeftRelationship();
  attr.other = other;
  attr.val = LeftRelationship.membership_fun(
             LeftRelationship.delta_angle(obj.x-other.x, obj.y-other.y));
  return attr;
}