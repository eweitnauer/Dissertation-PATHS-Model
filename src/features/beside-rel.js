/// Object being left or right to another object on a scale from 1 (very) to 0 (not at all).
BesideRelationship = function() {
  this.type = "metric";
  this.name = "beside-of";
  this.arity = 2;
  this.other = null;
  this.symmetric = true;
  this.labels = ['beside-of'];
  this.val = '?';
}

BesideRelationship.perceive = function(obj, other) {
  var attr = new BesideRelationship();
  attr.val = Math.max(LeftRelationship.perceive(obj, other).val,
                      RightRelationship.perceive(obj, other).val);
  return attr;
}