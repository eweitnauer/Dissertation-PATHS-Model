MovesAttribute = function(obj) {
  this.name = 'moves';
  this.constant = true;
  this.perceive(obj);
}

// google: "plot from -0.5 to 5, 1/(1+exp(20*(0.25-x)))"
MovesAttribute.membership = function(lin_vel) {
  var a = 20; // steepness of sigmoid function
  var m = 0.25; // linear velocity at which sigmoid is 0.5
  return 1/(1+Math.exp(a*(m-lin_vel)));
}

MovesAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = obj.phys_obj.m_linearVelocity.Length();
}

MovesAttribute.prototype.get_activity = function() {
  return MovesAttribute.membership(this.val);
}

MovesAttribute.prototype.get_label = function() {
  return 'moves';
}