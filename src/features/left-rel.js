/// Object beeing left to other object on a scale from 1 (very) to 0 (not at all).
LeftRelationship = function(obj, other) {
  this.name = "left-of";
  this.arity = 2;
  this.symmetry = false;
  this.constant = false;
  this.obj = obj;
  this.other = other;
  this.val = '?';
  this.rval = '?';
}

LeftRelationship.Analyzer = SpatialRelationAnalyzer(100, 100/2/100, 'left');

LeftRelationship.perceive = function(obj, other) {
  var rel = new LeftRelationship(obj, other);
  rel.val = LeftRelationship.Analyzer.getMembership(obj, other);
  rel.opp_val = RightRelationship.Analyzer.getMembership(obj, other);
  return rel;
}

LeftRelationship.prototype.get_activity = function() {
  if (this.val == '?') return 0;
  else return Math.max(0, this.val[1] - this.opp_val[1]);
}

LeftRelationship.prototype.get_label = function() {
  return 'left-of';
}