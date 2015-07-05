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

RecombineHypothesisCodelet.prototype.cloneDifferentMatchingSelector = function(obj, sel) {
  var hyp = this.ws.getRandomHypothesis({
    type: 'object'
  , filter: function(sol) {
      if (sol.sel.hasRelationships()) return false;
      if (!sol.sel.matchesObject(obj)) return false;
      if (sol.sel.equals(sel)) return false;
      return true;
    }
  });
  return hyp ? hyp.sel.clone() : false;
}

RecombineHypothesisCodelet.prototype.run = function() {
  // get a hypothesis with a relationship
  var hyp = this.ws.getRandomHypothesis(
    { main_side: 'both'
    , filter: function(hyp) { return hyp.sel.hasRelationships() }
    }
  );
  if (!hyp) return false;

  // pick one relationship from the hypothesis and select one object matching its reference selector
  var rel_idx = Random.int(hyp.sel.rels.length);
  var rel = hyp.sel.rels[rel_idx];
  var group = rel.other_sel.applyToScene(this.ws.getRandomScene());
  var obj = this.ws.getRandomObject(null, { pool: group.objs.map(function(o) { return o.object_node }) });
  if (!obj) return false;

  // pick an alternative selector that selects that object
  var new_sel = this.cloneDifferentMatchingSelector(obj, rel.other_sel);
  if (!new_sel) return;

  // create a new hypothesis with the relationship's reference selector replace by the new one
  var new_hyp = hyp.clone();
  var new_rel = new_hyp.sel.rels[rel_idx];
  if (!new_rel) {
    console.log('problem:');
    console.log(hyp.describe(), new_hyp.describe());
    console.log(new_hyp.sel.rels.length, hyp.sel.rels.indexOf(rel));
  }

  new_rel.other_sel = new_sel;
  new_sel.is_reference_selector = true;

  // ensure the new rel-matcher is different from the other rel-matchers
  // e.g., we don't want to get "close any object and close any object"
  for (var i=0; i<new_hyp.sel.rels.length; i++) {
    if (i !== rel_idx && new_hyp.sel.rels[i].equals(new_rel)) return false;
  }

  this.coderack.insert(new NewHypothesisCodelet(this.coderack, new_hyp));
  return true;
}
