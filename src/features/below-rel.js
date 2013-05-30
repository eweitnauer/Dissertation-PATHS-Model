/// Object beeing below to other object on a scale from 1 (very) to 0 (not at all).
BelowRelationship = function(obj, other) {
  this.perceive(obj, other);
}
BelowRelationship.prototype.key = "below";
BelowRelationship.prototype.arity = 2;
BelowRelationship.prototype.symmetry = false;
BelowRelationship.prototype.constant = false;

BelowRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  var above = SpatialRelationAnalyzer(100, 100/2/100, 'above').getMembership(obj, other);
  var below = SpatialRelationAnalyzer(100, 100/2/100, 'below').getMembership(obj, other);
  this.val = Math.max(0, below[1]-above[1]);
}


BelowRelationship.prototype.get_activity = function() {
  if (this.val == '?') return 0;
  else return this.val;
}

BelowRelationship.prototype.get_label = function() {
  return 'below';
}