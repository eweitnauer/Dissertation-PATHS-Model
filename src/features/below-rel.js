/// Object beeing below to other object on a scale from 1 (very) to 0 (not at all).
BelowRelationship = function(obj, other) {
  this.name = "below";
  this.arity = 2;
  this.symmetry = false;
  this.constant = false;
  this.obj = obj;
  this.other = other;
  this.val = '?';
}

BelowRelationship.Analyzer = SpatialRelationAnalyzer(100, 100/2/100, 'below');

BelowRelationship.perceive = function(obj, other) {
  var rel = new BelowRelationship(obj, other);
  rel.val = BelowRelationship.Analyzer.getMembership(obj, other);
  return rel;
}


BelowRelationship.prototype.get_activity = function() {
  if (this.val == '?') return 0;
  else return this.val[1];
}

BelowRelationship.prototype.get_label = function() {
  return 'below';
}