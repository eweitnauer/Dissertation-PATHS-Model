/// Object beeing left to other object on a scale from 1 (very) to 0 (not at all).
LeftRelationship = function(obj, other) {
  this.name = "left-of";
  this.arity = 2;
  this.symmetry = false;
  this.constant = false;
  this.perceive(obj, other);
}

LeftRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  var left = SpatialRelationAnalyzer(100, 100/2/100, 'left').getMembership(obj, other);
  var right = SpatialRelationAnalyzer(100, 100/2/100, 'right').getMembership(obj, other);
  this.val = Math.max(0, left[1]-right[1]);
}

LeftRelationship.prototype.get_activity = function() {
  if (this.val == '?') return 0;
  return this.val;
}

LeftRelationship.prototype.get_label = function() {
  return 'left-of';
}