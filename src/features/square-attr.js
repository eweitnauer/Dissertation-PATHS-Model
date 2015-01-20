SquareAttribute = function(obj) {
  this.perceive(obj);
}
SquareAttribute.prototype.key = 'square';
SquareAttribute.prototype.targetType = 'obj';
SquareAttribute.prototype.arity = 1;
SquareAttribute.prototype.constant = true;
SquareAttribute.prototype.base_level = true;

/// Returns an SquareAttribute instance, which is the perception of the passed
/// object's shape. Possible shapes are circle, triangle, rectangle, square and
/// unknown.
SquareAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = SquareAttribute.squareness(obj);
}

SquareAttribute.prototype.get_activity = function() {
  return this.val;
}

SquareAttribute.prototype.get_label = function() {
  return this.key;
}

SquareAttribute.squareness = function(shape) {
  if (shape instanceof Polygon) {
    if (!shape.closed) return 0;
    shape.order_vertices();
    if (SquareAttribute.isRectangle(shape)) {
      // in square, all edges should have the same length
      var edges = shape.get_edge_lengths(true); // sorted by length
      if (edges[0]/edges[3] < 0.7) return 0.3;
      else return 1;
    }
  }
  return 0;
}

/// Returns true, if Polygon has 4 corners, all with angles in [70,110] degree.
SquareAttribute.isRectangle = function(poly) {
  if (poly.pts.length != 4) return false;
  var a_max = 110 * Math.PI / 180, a_min = 70 * Math.PI / 180;
  for (var i=0; i<poly.pts.length; ++i) {
    if (poly.angle(i) > a_max || poly.angle(i) < a_min) return false;
  }
  return true;
}
