/// Object beeing right to other object on a scale from 1 (very) to 0 (not at all).
RightRelationship = function(obj, other) {
  this.name = "right-of";
  this.arity = 2;
  this.symmetry = false;
  this.constant = false;
  this.obj = obj;
  this.other = other;
  this.val = '?';
  this.opp_val = '?';
}

RightRelationship.Analyzer = SpatialRelationAnalyzer(100, 100/2/100, 'right', null, function(x) {
  var a = 2*Math.abs(x)/Math.PI-1;
  if (Math.abs(x)>Math.PI/2) return 0;
  return -a*a*a;
});

RightRelationship.perceive = function(obj, other) {
  var rel = new RightRelationship(obj, other);
  rel.val = RightRelationship.Analyzer.getMembership(obj, other);
  rel.opp_val = LeftRelationship.Analyzer.getMembership(obj, other);
  return rel;
}


RightRelationship.prototype.get_activity = function() {
  if (this.val == '?') return 0;
  else return Math.max(0, this.val[1] - this.opp_val[1]);
}

RightRelationship.prototype.get_label = function() {
  return 'right-of';
}