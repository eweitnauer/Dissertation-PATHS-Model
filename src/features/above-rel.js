/// Object beeing above to other object on a scale from 1 (very) to 0 (not at all).
AboveRelationship = function(obj, other) {
  this.name = "above";
  this.arity = 2;
  this.symmetry = false;
  this.constant = false;
  this.perceive(obj, other);
}

AboveRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  var above = SpatialRelationAnalyzer(100, 100/2/100, 'above').getMembership(obj, other);
  var below = SpatialRelationAnalyzer(100, 100/2/100, 'below').getMembership(obj, other);
  this.val = Math.max(0, above[1]-below[1]);
}

AboveRelationship.prototype.get_activity = function() {
  if (this.val == '?') return 0;
  else return this.val;
}

AboveRelationship.prototype.get_label = function() {
  return 'above';
}