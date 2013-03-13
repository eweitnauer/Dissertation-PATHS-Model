/// Object being right to other object on a scale from 1 (very) to 0 (not at all).
RightRelationship = function() {
  this.type = "metric";
  this.name = "right-to";
  this.arity = 2;
  this.other = null;
  this.labels = ['right-to'];
  this.val = '?';
}

/// Returns the delta angle to "right", given dx and dy of two points.
RightRelationship.delta_angle = function(dx, dy) {
  if (dx == 0 && dy == 0) return 0;
  else return Math.acos(dx/Math.sqrt(dx*dx+dy*dy)); // arccos([dx, dy] * [1, 0] / ||dx,dy||)
}

RightRelationship.membership_fun = function(d_angle) {
  return Math.max(0, 1-2*d_angle/Math.PI);
}

RightRelationship.perceive = function(obj, other) {
  var attr = new RightRelationship();
  attr.other = other;
  attr.val = RightRelationship.membership_fun(
             RightRelationship.delta_angle(obj.x-other.x, obj.y-other.y));
  return attr;
}