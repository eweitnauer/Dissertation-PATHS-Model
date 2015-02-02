/**
 * Uses the passed attribute / relationship and side to create the respective
 * hypothesis + selector. Then it applies the hypothesis to the currently active
 * scenes. If all scenes match or only the scenes of one side match, it adds
 * the hypothesis to the global list of hypotheses.
 */
var NewHypothesisCodelet = function(coderack, percept_or_hyp, time) {
  this.coderack = coderack;
  this.followup = [];
  this.ws = this.coderack.ws;
  if (percept_or_hyp instanceof Solution) this.hypothesis = percept_or_hyp;
  else this.percept = percept_or_hyp;
  this.time = time;
}

NewHypothesisCodelet.prototype.name = 'NewHypC';

NewHypothesisCodelet.prototype.describe = function() {
  if (this.hypothesis) return 'NewHypothesisCodelet(' + this.hypothesis.describe() + ')';
  else return 'NewHypothesisCodelet(' + this.percept.key + '=' + this.percept.val + ')';
}

NewHypothesisCodelet.prototype.createAttrHyp = function() {
  var time = this.percept.constant ? 'start' : this.time;
  return new Solution((new Selector()).use_attr(this.percept, time));
}

/**
 * We need to construct a selector that matches the target object of the
 * relationship. This is tough in general, so we'll just search through
 * all existing object hypotheses and pick one that matches the target object.
 * If none does, returns null.
 */
NewHypothesisCodelet.prototype.createRelHyp = function() {
  var other = this.percept.other.object_node;
  var other_sel = this.ws.getRandomHypothesis({
    //no_blank: true
    type: 'object'
  , filter: function(sol) {
      return !sol.sel.hasRelationships() //&& sol.selectsSingleObjects()
          && sol.sel.matchesObject(other)
    }
  });
  //if (!other_sel) other_sel = this.ws.blank_hypothesis;
  if (!other_sel) return null;
  return new Solution((new Selector()).use_rel(other_sel.sel, this.percept, this.time));
}

NewHypothesisCodelet.prototype.mergeBaseSelector = function(hyp) {
  var g = this.percept.group;
  if (g.objs.length < g.scene_node.objs.length) {
    this.ws.log(4, 'perceived group feature based on selector result');
    var base_hyp = this.ws.getRandomHypothesis({ filter: function(sol) {
      return g.selectors.indexOf(sol.sel) !== -1;
    }});
    hyp.sel = hyp.sel.mergedWith(base_hyp.sel);
  }
}

/**
 * Create hypothesis with the passed percept and apply it to the current
 * scenes. Then add it to the active hypotheses if it matches all scenes
 * or just all scenes from one side.
 */
NewHypothesisCodelet.prototype.run = function() {
  var self = this;

  var hyp = this.hypothesis;
  if (!hyp) {
    if (this.percept.arity === 1) hyp = this.createAttrHyp();
    else hyp = this.createRelHyp();
    if (hyp && this.percept.targetType === 'group') this.mergeBaseSelector(hyp);
  }
  if (!hyp) return false;

  var existing_hyp = this.ws.getEquivalentHypothesis(hyp);
  if (!existing_hyp) {
    this.ws.addHypothesis(hyp, 0); // initial att. will be set by CheckHypCodelet
    this.coderack.insert(new CheckHypothesisCodelet(this.coderack, hyp));
    return true;
  } else if (!existing_hyp.wasMatchedAgainst(this.ws.scene_pair_index)) {
    this.coderack.insert(new CheckHypothesisCodelet(this.coderack, existing_hyp));
  }
  return false;
}
