/// Object beeing below to other object on a scale from 1 (very) to 0 (not at all).
BelowRelationship = function() {
  this.type = "metric";
  this.name = "below";
  this.arity = 2;
  this.other = null;
  this.labels = ['below'];
  this.val = '?';
}

/// Returns the delta angle to "below", given dx and dy of two points.
BelowRelationship.delta_angle = function(dx, dy) {
  if (dx == 0 && dy == 0) return 0;
  else return Math.acos(dy/Math.sqrt(dx*dx+dy*dy)); // arccos([dx, dy] * [0, 1] / ||dx,dy||)
}

BelowRelationship.membership_fun = function(d_angle) {
  return Math.max(0, 1-2*d_angle/Math.PI);
}

BelowRelationship.perceive = function(obj, other) {
  var attr = new BelowRelationship();
  attr.other = other;
  attr.val = BelowRelationship.membership_fun(
             BelowRelationship.delta_angle(obj.x-other.x, obj.y-other.y));
  return attr;
}