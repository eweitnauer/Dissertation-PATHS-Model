RectangleAttribute = function(obj) {
  this.perceive(obj);
}
RectangleAttribute.prototype.key = 'rect';
RectangleAttribute.prototype.targetType = 'obj';
RectangleAttribute.prototype.arity = 1;
RectangleAttribute.prototype.constant = true;

/// Returns an RectangleAttribute instance, which is the perception of the passed
/// object's shape. Possible shapes are circle, triangle, rectangle, square and
/// unknown.
RectangleAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = RectangleAttribute.rectness(obj);
}

RectangleAttribute.prototype.get_activity = function() {
  return this.val;
}

RectangleAttribute.prototype.get_label = function() {
  return this.key;
}

RectangleAttribute.rectness = function(shape) {
  if (shape instanceof Polygon) {
    if (!shape.closed) return 0;
    shape.order_vertices();
    if (RectangleAttribute.isRectangle(shape)) {
      // in square, all edges should have the same length
      var edges = shape.get_edge_lengths(true); // sorted by length
      if (edges[0]/edges[3] < 0.7) return 1;
      else return 0.4;
    }
  }
  return 0;
}

/// Returns true, if Polygon has 4 corners, all with angles in [70,110] degree.
RectangleAttribute.isRectangle = function(poly) {
  if (poly.pts.length != 4) return false;
  var a_max = 110 * Math.PI / 180, a_min = 70 * Math.PI / 180;
  for (var i=0; i<poly.pts.length; ++i) {
    if (poly.angle(i) > a_max || poly.angle(i) < a_min) return false;
  }
  return true;
}
