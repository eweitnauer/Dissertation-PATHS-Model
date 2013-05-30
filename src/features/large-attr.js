LargeAttribute = function(obj) {
  this.perceive(obj);
}
LargeAttribute.prototype.key = 'large';
LargeAttribute.prototype.constant = true;

// google: "plot from -10 to 1000, 1/(1+exp(4*(2-x/100)))"
LargeAttribute.membership = function(area) {
  var a = 4; // steepness of sigmoid function
  var m = 2.0; // area at which sigmoid is 0.5 (whole scene has area 100)
  var size = 100;
  return 1/(1+Math.exp(a*(m-area/size/size*100)));
}

LargeAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = Math.abs(obj.area());
}

LargeAttribute.prototype.get_activity = function() {
  return LargeAttribute.membership(this.val);
}

LargeAttribute.prototype.get_label = function() {
  return 'large';
}