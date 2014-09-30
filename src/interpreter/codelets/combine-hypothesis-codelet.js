/** Will pick two generalizing type selectors and combine them. */
var CombineHypothesisCodelet = function(coderack) {
  this.coderack = coderack;
  this.followup = [];
  this.ws = this.coderack.ws;
}

CombineHypothesisCodelet.prototype.describe = function() {
  return 'CombineHypothesisCodelet';
}

CombineHypothesisCodelet.prototype.run = function() {
  var hyp1 = this.ws.getRandomHypothesis({no_blank: true, filter:
    function(sol) { return (sol.sel.type !== 'mixed') && sol.sel.too_general }
  });
  if (!hyp1) return;
  var hyp2 = this.ws.getRandomHypothesis({no_blank: true, filter:
    function(sol) { return ((sol !== hyp1) && (sol.sel.type === hyp1.type) && sol.sel.too_general)  }
  });
  if (!hyp2) return;
  var hyp12 = hyp1.mergedWith(hyp2);
  if (!hyp12 || hyp12.equals(hyp1) || hyp12.equals(hyp2)) return;
  this.ws.log(3, 'combined', hyp1.describe(), 'and', hyp2.describe());


  this.coderack.insert(new NewHypothesisCodelet(this.coderack, hyp12));
}