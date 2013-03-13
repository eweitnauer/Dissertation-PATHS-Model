/// Object beeing above to other object on a scale from 1 (very) to 0 (not at all).
AboveRelationship = function(obj, other) {
  this.name = "above";
  this.arity = 2;
  this.symmetry = false;
  this.constant = false;
  this.obj = obj;
  this.other = other;
  this.val = '?';
}

AboveRelationship.Analyzer = SpatialRelationAnalyzer(100, 100/2/100, 'above');

AboveRelationship.perceive = function(obj, other) {
  var rel = new AboveRelationship(obj, other);
  rel.val = AboveRelationship.Analyzer.getMembership(obj, other);
  return rel;
}

AboveRelationship.prototype.get_activity = function() {
  if (this.val == '?') return 0;
  else return this.val[1];
}

AboveRelationship.prototype.get_label = function() {
  return 'above';
}