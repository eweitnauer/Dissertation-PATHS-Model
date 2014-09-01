TriangleAttribute = function(obj) {
  this.perceive(obj);
}
TriangleAttribute.prototype.key = 'triangle';
TriangleAttribute.prototype.targetType = 'obj';
TriangleAttribute.prototype.arity = 1;
TriangleAttribute.prototype.constant = true;

/// Returns an TriangleAttribute instance, which is the perception of the passed
/// object's shape. Possible shapes are circle, triangle, rectangle, square and
/// unknown.
TriangleAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = TriangleAttribute.triangleness(obj);
}

TriangleAttribute.prototype.get_activity = function() {
  return this.val;
}

TriangleAttribute.prototype.get_label = function() {
  return this.key;
}

TriangleAttribute.triangleness = function(shape) {
  if ((shape instanceof Polygon) && shape.closed && shape.pts.length === 3) return 1;
  return 0;
}
