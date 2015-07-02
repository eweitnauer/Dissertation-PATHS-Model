/** Will pick a "both" solution with a relationship matcher and swap its target selector. */
var RecombineHypothesisCodelet = function(coderack) {
  this.coderack = coderack;
  this.followup = [];
  this.ws = this.coderack.ws;
}

RecombineHypothesisCodelet.prototype.name = 'recombine hyp';

RecombineHypothesisCodelet.prototype.describe = function() {
  return 'RecombineHypothesisCodelet';
}

RecombineHypothesisCodelet.prototype.getBlankRelationship = function(sel) {
  var blanks = sel.rels.filter(function(rel) { return rel.other_sel.blank() });
  if (!blanks.length) return null;
  else return Random.pick(blanks);
}

RecombineHypothesisCodelet.prototype.run = function() {
  var hyp1 = this.ws.getRandomHypothesis(
    { main_side: 'both'
    , filter: function(hyp) { return hyp.sel.hasRelationships() }
    }
  );
  if (!hyp1) return false;

  var rel = Random.pick(hyp1.sel.rels);
  var group = rel.other_sel.applyToScene(this.ws.getRandomScene());
  var obj = this.ws.getRandomObject(null, { pool: group.objs.map(function(o) { return o.object_node }) });
  if (!obj) return false;

  var new_other_sel = this.ws.getRandomHypothesis({
    type: 'object'
  , filter: function(sol) {
      return !sol.sel.hasRelationships()
          && sol.sel.matchesObject(obj)
          && sol.sel !== rel.other_sel;
    }
  });
  if (!new_other_sel) return false;
  new_other_sel = new_other_sel.sel;

  var new_hyp = hyp1.clone();
  var new_rel = new_hyp.sel.rels[hyp1.sel.rels.indexOf(rel)];

  new_rel.other_sel = new_other_sel;
  this.coderack.insert(new NewHypothesisCodelet(this.coderack, new_hyp));
  return true;
}
