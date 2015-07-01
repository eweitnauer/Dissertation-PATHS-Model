/** Will pick two generalizing type selectors and combine them. */
var CombineHypothesisCodelet = function(coderack) {
  this.coderack = coderack;
  this.followup = [];
  this.ws = this.coderack.ws;
}

CombineHypothesisCodelet.prototype.name = 'combine hyp';

CombineHypothesisCodelet.prototype.describe = function() {
  return 'CombineHypothesisCodelet';
}

CombineHypothesisCodelet.prototype.getBlankRelationship = function(sel) {
  var blanks = sel.rels.filter(function(rel) { return rel.other_sel.blank() });
  if (!blanks.length) return null;
  else return Random.pick(blanks);
}

CombineHypothesisCodelet.prototype.run = function() {
  var obj = this.ws.getRandomObject(null, { filter: function(o) { return o.selectors.length >= 2 }});
  if (!obj) return false;
  var hyp_pool = obj.selectors.map(function(sel) { return sel.solution });
  var hyp1 = this.ws.getRandomHypothesis(
    { no_blank: true, pool: hyp_pool, main_side: 'both' }
  );
  if (!hyp1) return false;
  var hyp2 = this.ws.getRandomHypothesis(
    { no_blank: true, pool: hyp_pool, main_side: 'both'
    , filter: function(hyp) {
      return hyp !== hyp1 && hyp.compatibleWith(hyp1)
        && hyp1.sel.merged_with.indexOf(hyp.sel) === -1
        && hyp.sel.merged_with.indexOf(hyp1.sel) === -1 }}
  );
  if (!hyp2) return false;
  var hyp12 = hyp1.mergedWith(hyp2);
  hyp1.sel.merged_with.push(hyp2);
  hyp2.sel.merged_with.push(hyp1);
  if (!hyp12 || hyp12.equals(hyp1) || hyp12.equals(hyp2)) return false;
  if (!this.ws.isNewHypothesis(hyp12)) return false;

  this.coderack.insert(new NewHypothesisCodelet(this.coderack, hyp12));
  return true;
}
