/// -1 (top) ... 0 (center) ... 1 (bottom)
VerticalPositionAttribute = function() {
  this.type = "metric";
  this.name = "vpos";
  this.labels = ['top', 'center', 'bottom'];
  this.val = '?';
}

VerticalPositionAttribute.perceive = function(obj) {
  var attr = new VerticalPositionAttribute();
  attr.val = 2*obj.y/100 - 1;
  return attr;
}