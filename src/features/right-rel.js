/// Object beeing right to other object on a scale from 1 (very) to 0 (not at all).
RightRelationship = function(obj, other) {
  this.perceive(obj, other);
}
RightRelationship.prototype.key = "right_of";
RightRelationship.prototype.targetType = 'obj';
RightRelationship.prototype.arity = 2;
RightRelationship.prototype.symmetry = false;
RightRelationship.prototype.constant = false;

RightRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  var left = SpatialRelationAnalyzer(100, 100/2/100, 'left').getMembership(obj, other);
  var right = SpatialRelationAnalyzer(100, 100/2/100, 'right').getMembership(obj, other);
  this.val = Math.max(0, right[1]-left[1]);
}


RightRelationship.prototype.get_activity = function() {
  if (this.val == '?') return 0;
  return this.val;
}

RightRelationship.prototype.get_label = function() {
  return 'right-of';
}