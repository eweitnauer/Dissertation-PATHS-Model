DistanceRelationship = function() {
  this.type = "metric";
  this.name = "distance";
  this.arity = 2;
  this.symmetric = true;
  this.labels = ['near', 'far'];
  this.val = '?';
  this.other = null;
}

DistanceRelationship.perceive = function(obj, other) {
  var dr = new DistanceRelationship();
  dr.val = obj.phys_obj.distance(other.phys_obj) / obj.phys_scale;
  dr.other = other;
  return dr;
}