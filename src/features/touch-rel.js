TouchRelationship = function() {
  this.type = "metric";
  this.name = "touches";
  this.arity = 2;
  this.other = null;
  this.symmetric = true;
  this.labels = ['touches'];
  this.val = '?';
}

TouchRelationship.perceive = function(obj, other) {
  var attr = new TouchRelationship();
  var dist = obj.phys_obj.distance(other.phys_obj);
  attr.val = (dist <= 0) ? 1 : 0;
  return attr;
}