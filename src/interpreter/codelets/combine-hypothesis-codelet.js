/** Will pick two generalizing type selectors and combine them. */
var CombineHypothesisCodelet = function(coderack) {
  this.coderack = coderack;
  this.followup = [];
  this.ws = this.coderack.ws;
}

CombineHypothesisCodelet.prototype.name = 'CombHypC';

CombineHypothesisCodelet.prototype.describe = function() {
  return 'CombineHypothesisCodelet';
}

CombineHypothesisCodelet.prototype.getBlankRelationship = function(sel) {
  var blanks = sel.rels.filter(function(rel) { return rel.other_sel.blank() });
  if (!blanks.length) return null;
  else return Random.pick(blanks);
}

CombineHypothesisCodelet.prototype.run = function() {
  var obj = this.ws.getRandomObject();
  if (obj.selectors.length < 2) return;
  var hyp_pool = obj.selectors.map(function(sel) { return sel.solution });
  var hyp1 = this.ws.getRandomHypothesis(
    { no_blank: true, pool: hyp_pool, main_side: 'both' }
  );
  if (!hyp1) return false;
  var hyp2 = this.ws.getRandomHypothesis(
    { no_blank: true, pool: hyp_pool, main_side: 'both'
    , filter: function(hyp) { return hyp !== hyp1 && hyp.compatibleWith(hyp1) }}
  );
  if (!hyp2) return false;
  // var hyp1 = this.ws.getRandomHypothesis({no_blank: true, filter:
  //   function(sol) { return sol.main_side === 'both' }
  // });
  // if (!hyp1) return;
  // var hyp2 = this.ws.getRandomHypothesis({no_blank: true, filter:
  //   function(sol) { return sol !== hyp1 && sol.main_side === 'both' }
  // });
  // if (!hyp2) return;
  var hyp12;
  // var blank_rel = this.getBlankRelationship(hyp1.sel);
  // if (blank_rel && !hyp2.sel.hasRelationships()) {
  //   hyp12 = hyp1.clone();
  //   var idx = hyp12.sel.rels.indexOf(blank_rel);
  //   hyp12.sel.rels[idx] = hyp12.sel.rels[idx].clone();
  //   hyp12.sel.rels[idx].other_sel = hyp2.sel;
  // } else {
    hyp12 = hyp1.mergedWith(hyp2);
  // }
  if (!hyp12 || hyp12.equals(hyp1) || hyp12.equals(hyp2)) return false;
  if (!this.ws.isNewHypothesis(hyp12)) return false;

  this.ws.log(3, 'combined', hyp1.describe(), 'and', hyp2.describe());
  // console.log('complexity:', hyp1.sel.getComplexity(), '+'
  //            , hyp2.sel.getComplexity(), '==>', hyp12.sel.getComplexity());

  this.coderack.insert(new NewHypothesisCodelet(this.coderack, hyp12));
  return true;
}
