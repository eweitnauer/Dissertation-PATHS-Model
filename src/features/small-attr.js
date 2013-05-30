SmallAttribute = function(obj) {
  this.perceive(obj);
}
SmallAttribute.prototype.key = 'small';
SmallAttribute.prototype.constant = true;

// google: "plot from -10 to 1000, 1-1/(1+exp(4*(1.8-x/100)))"
SmallAttribute.membership = function(area) {
  var a = 4; // steepness of sigmoid function
  var m = 1.8; // area at which sigmoid is 0.5 (whole scene has area 100)
  var size = 100;
  return 1-1/(1+Math.exp(a*(m-area/size/size*100)));
}

SmallAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = Math.abs(obj.area());
}

SmallAttribute.prototype.get_activity = function() {
  return SmallAttribute.membership(this.val);
}

SmallAttribute.prototype.get_label = function() {
  return 'small';
}