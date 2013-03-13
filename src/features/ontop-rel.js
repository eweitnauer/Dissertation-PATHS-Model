/// Object is on top of another object if it is above and touches it.
OnTopRelationship = function() {
  this.type = "metric";
  this.name = "on-top-of";
  this.arity = 2;
  this.other = null;
  this.labels = ['on-top-of'];
  this.val = '?';
}

OnTopRelationship.perceive = function(obj, other) {
  var rel = new OnTopRelationship();
  rel.other = other;
  rel.val = TouchRelationship.perceive(obj, other).val * AboveRelationship.perceive(obj, other).val;
  return rel;
}