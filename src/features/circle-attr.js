CircleAttribute = function(obj) {
  this.perceive(obj);
}
CircleAttribute.prototype.key = 'circle';
CircleAttribute.prototype.targetType = 'obj';
CircleAttribute.prototype.arity = 1;
CircleAttribute.prototype.constant = true;

/// Returns an CircleAttribute instance, which is the perception of the passed
/// object's shape. Possible shapes are circle, triangle, rectangle, square and
/// unknown.
CircleAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = CircleAttribute.circleness(obj);
}

CircleAttribute.prototype.get_activity = function() {
  return this.val;
}

CircleAttribute.prototype.get_label = function() {
  return this.key;
}

CircleAttribute.circleness = function(shape) {
  if (shape instanceof Circle) return 1;
  else return 0;

  // cool feature:
  // check roundness of an object by getting its convex hull and
  // then see how much the difference between the convex hull corner & midpoints
  // and the "radius" of the convex hull
}

