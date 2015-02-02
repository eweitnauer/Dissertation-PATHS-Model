/* jshint laxcomma: true, asi: true */
var PI = PI || {};

/*

Version 0.5.6
- normalize influence of hypothesis on object by number of selected objects
- set addend to object's activation to 0 so now the object activation is set
  completely by the hypothesis activations (the "any object" hypothesis makes
  sure we'll consider all objects)
- when an existing hypothesis is reconsidered after perceiving a new feature,
  it is checked on the current scene pair if it wasn't already
- when combining hypotheses, pick a second one that was not already combined
  with the first one before
- changed ratio for codelet selection to (0.6,0.3,0.1)

Version 0.5.5
- removed left-most and right-most object prior
- don't use single as attribute anymore, it is never used by humans

Version 0.5.4
- randomized order of PBP rows

Version 0.5.3
- disable specificity advantage ==> PBP 26 solved 1/20
                         before ==>        solved 4/20
- changed feature priors: now base level features have high, dynamic features
  have medium and everything else has low priors.
- blank selector now has complexity 1 and base level features (shapes & sizes)
  only add complexity of 0.5
- selects-all-scenes selectors get only increased probability if based on
  base level features (like: "circle", but not "stable object")
- after all the changes above: PBP26 solved 2/20
- made negations in solutions more expensive: add 2^neg_count to the complexity
  if there are any negations

Version 0.5.2
- Perceptions can now be done deliberatively (in which case they lead to
hypotheses). If they are not done deliberatively, they are still cached, but
can be perceived deliberatively later. This way an feature checked through a
hypotheses (not deliberatively) is still available for constructing hypotheses
later.
- first unique, exists and all modes are checked for a potential solution,
the unique and exists are checked again for matching both sides
- one less parameter: when choosing an object or group first, which of those
types is chosen is determined by the activities of all group vs. obj features
- added two new problems:
  - PBP36: 2/20, PBP35: 3/20

Version 0.5.1
- new activity formula for hypotheses
  - [ PBP04': 20/20 185+-155
    , PBP08 : 20/20 108 +-48
    , PBP26 :  3/20]
  ==> PBP08 is sometimes pretty hard since filter-type selectors are higher
  rated now
- fixed ratio for codelet selection (0.45,0.45,0.1)
  - about the same
- new scene switching formula ==> is this any better???
  - about the same
- object priors based on interesting features
  - about the same, but PBP26: 7 of 20
- feature group activity spreading
  - about the same (even fixed uniform activity among all features is only
    slightly worse) ==> I might need to look at problems where features need
    to be combined!
  - ==> disabled again

Version 0.5.0
- switching to a probability-inspired attention system without annealing or clamping
- AttentionNet.updateActivities() calculates and normalized all activities and
is called once after each codelet run.
- we don't cache the perception results from CheckHypothesis calls anymore (we
need to perceive attributes in the AttrCodelet so that a hypothesis can be constructed
from them)
- Problems with this version
  - almost correct LR-hypotheses are too strong compared to new L/R and
    LR-matches all hypotheses and also make scene switching slow
  - it is questionable why we should activate features of existing hypotheses,
    since these will be checked for by the hypothesis anyways (see PBP08 case
    above, though)
  - [ PBP04': 16/20 310+-370
    , PBP08 : 20/20 159+-168
    , PBP26 :  7/20]

Version 0.4.7
- switched off unique and all solution modes

Version 0.4.6
- don't perceive all hypotheses automatically on each new scene to pick a group,
instead, pick only among existing groups
- selectors now automatically add their perceived groups to the scene's groups
array (and merge with an existing group if it contains the same objects)

Version 0.4.5
- set pick_feature_first probability to 0 by default
- prevent "no codelet to run" steps

Version 0.4.4
- bugfix: no longer accepts hypotheses as solutions before they were tested
  on all scenes

Version 0.4.3
- bugfixes
- separate values for initial and consequitive attention update for selectors

Version 0.4.2
- We don't use solution codelets anymore. Instead, we keep track of which
left and right scenes each selector fits and if they all fit, its a solution!

Version 0.4.1
- shifting attention between scenes in a fixed scheme
- fixed a-priori probabilities for looking at start and end time
- instead of scaling to normalize attention values, we simply clamp them now
- don't set attention values directly, but only increase / decrease them in steps
- cooldown for all attention values

Version 0.4.0
- adding in attention mechanism for selectors:
  - initialize with attention value based on number of scenes matching
- adding in attention mechanism for objects:
  - spread attention from selectors to selected objects
  - add attention to objects with certain attributes (like moves)
  - add attention to objects in certain relationships (like hits)
  - spread attention from selectors to used features


PBP  2: [CountAttribute]
PBP  4: [ShapeAttribute]
PBP  8: [StabilityAttribute]
PBP 11: [CloseAttribute]
PBP 12: [OnTopRelationship, SmallAttribute]
PBP 13: [CountAttribute, OnGroundAttribute]
PBP 16: [RightRelationship, LeftRelationship, ShapeAttribute]
PBP 18: [TouchAttribute, TouchRelationship]
PBP 20: [SupportsRelationship, ShapeAttribute]
PBP 22: [HitsRelationship, CollidesRelationship]
PBP 26: [ShapeAttribute, LeftAttribute]
PBP 31: [MovableUpAttribute, ShapeAttribute]
*/
var pi_version = '0.5.6';
var pi_default_options = function() {
  var low = 0.1, mid = 0.2, high = 0.3;
  return {
    version: pi_version
  , features: [
                { klass: CircleAttribute,      initial_activation: high,  group: 'shape' }
              , { klass: SquareAttribute,      initial_activation: high,  group: 'shape' }
              , { klass: TriangleAttribute,    initial_activation: high,  group: 'shape' }
              , { klass: RectangleAttribute,   initial_activation: high,  group: 'shape' }
              , { klass: SmallAttribute,       initial_activation: high,  group: 'shape' }
              , { klass: LargeAttribute,       initial_activation: high,  group: 'shape' }
                //, { klass: ShapeAttribute,       initial_activation: high, group: 'shape' }
              , { klass: MovesAttribute,       initial_activation: mid, group: 'dynamics' }
              , { klass: StabilityAttribute,   initial_activation: mid, group: 'dynamics' }
              // , { klass: SingleAttribute,      initial_activation: low, group: 'distance' }
              , { klass: TouchRelationship,    initial_activation: low, group: 'distance' }
              , { klass: CountAttribute,       initial_activation: low,  group: 'shape' }
              , { klass: CloseAttribute,       initial_activation: low,  group: 'distance' }
              , { klass: CloseRelationship,    initial_activation: low,  group: 'distance' }
              , { klass: TopMostAttribute,     initial_activation: low,  group: 'vert-pos' }
                // , { klass: LeftMostAttribute,    initial_activation: low,  group: 'hor-pos' }
                // , { klass: RightMostAttribute,   initial_activation: low,  group: 'hor-pos' }
                , { klass: FarRelationship,      initial_activation: low,  group: 'distance' }
                , { klass: FarAttribute,         initial_activation: low,  group: 'distance' }
              , { klass: OnTopRelationship,    initial_activation: low,  group: 'vert-pos' }
              , { klass: OnGroundAttribute,    initial_activation: low,  group: 'vert-pos' }
              , { klass: RightRelationship,    initial_activation: low,  group: 'hor-pos' }
              , { klass: LeftRelationship,     initial_activation: low,  group: 'hor-pos' }
                , { klass: AboveRelationship,    initial_activation: low,  group: 'vert-pos' }
                , { klass: BelowRelationship,    initial_activation: low,  group: 'vert-pos' }
                , { klass: BesideRelationship,   initial_activation: low,  group: 'hor-pos' }
                , { klass: BottomAttribute,      initial_activation: low,  group: 'vert-pos' }
                , { klass: TopAttribute,         initial_activation: low,  group: 'vert-pos' }
              , { klass: TouchAttribute,       initial_activation: low,  group: 'distance' }
              , { klass: SupportsRelationship, initial_activation: low,  group: 'dynamics' }
              , { klass: HitsRelationship,     initial_activation: low,  group: 'dynamics' }
               , { klass: GetsHitRelationship,     initial_activation: low,  group: 'dynamics' }
              , { klass: CollidesRelationship, initial_activation: low,  group: 'dynamics' }
              , { klass: LeftAttribute,        initial_activation: low,  group: 'hor-pos' }
              , { klass: RightAttribute,       initial_activation: low,  group: 'hor-pos' }
              , { klass: MovableUpAttribute,   initial_activation: low,  group: 'dynamics' }
             ]
  , pres_mode: 'interleaved-sim-sim' // {blocked, interleaved} X {sim, dis} X {sim, dis}
  , randomize_row_order: true
  , pres_time: 100 // every x steps, switch to the next scene pair
  , action_priors:
    {
      perceive: 0.6
    , check_hyp: 0.3
    , combine_hyp: 0.1
    }
  , perception:
    {
      pick_feature_first: 0.5 // probability that the feature (vs. the target) is
                              // picked first during perception
    }
  , activity:
    { time: { start: 0.67, end: 0.33 }
    , feature: {
      hyp_base: 0.1 // >=0, the smaller, the bigger the influence of hypotheses activities
    }
    , obj: {
        hyp_base: 0 // >=0, the smaller, the bigger the influence of hypotheses activities
      , attr_priors: { // only apply at time "start"
          moves: 2
          // should we include stability->unstable?
        , top_most: 1.5 // this & below: often will get boosted via sel.specificity, too
        // , single: 1.5
        //, left_most: 1.25
        //, right_most: 1.25
        }
      }
    }
  };
}

PI[pi_version.replace(/\./g, '_')] = (function(opts) {
  var version = pi_version;

  var options = opts || pi_default_options();

  var createWorkspace = function(scenes, loglevel) {
    var ws = new Workspace(scenes, options, loglevel);
    ws.coderack.behaviors.push(new MainBehavior(ws.coderack));
    return ws;
  }

  /// Will create Attr-, NewHypothesis-, RefineHypothesis-, and SolveCodelets. What is created
  /// next will depend on a "mindset" value: 0 is complete explore and 1 complete exploit
  /// behavior. For now it just creates one of the four codelet types with a preset and fixed
  /// probability.
  var MainBehavior = function(coderack, attrs) {
    this.cr = coderack;
    this.ws = coderack.ws;
    this.name = 'MainBehavior';
    this.codelet_infos = [{klass: AttrCodelet, attention: options.action_priors.perceive }
                         ,{klass: CheckHypothesisCodelet, attention: options.action_priors.check_hyp }
                         ,{klass: CombineHypothesisCodelet, attention: options.action_priors.combine_hyp }];
    this.att_getter = function(ci) {
      return ci.attention// * coderack.getCodeletTypeActivity(ci.klass)
    };
  }

  MainBehavior.prototype.updateAttentions = function() {
    var hyps = this.ws.attentionNet.solutions;
    var checked_lr_max = 0, unchecked_sum = 0; // max attention among respective solutions
    var expl_sum = 0;
    for (var i=0; i<hyps.length; i++) {
      var hyp = hyps[i];
      var was_checked = hyp.wasMatchedAgainst(this.ws.scene_pair_index);
      var val = this.ws.attentionNet.getActivity(hyp);
      if (hyp.main_side === 'both' && was_checked) checked_lr_max = Math.max(checked_lr_max, val);
      if (!was_checked) unchecked_sum += val;
      if (was_checked && (hyp.main_side === 'left' || hyp.main_side === 'right')) {
        expl_sum += val;
      }
    }
    // this.codelet_infos[0].attention = 0.6;
    // this.codelet_infos[1].attention = 0.3;//unchecked_sum;//0.3//1-(1/Math.pow(2, 3*unchecked_sum));
    // this.codelet_infos[2].attention = 0.1;//checked_lr_max/2;//0.1//Math.max(0, 1-(1/Math.pow(2, 2*checked_lr_max)));
    this.expl_sum = expl_sum;
    this.unchecked_sum = unchecked_sum;
  }

  MainBehavior.prototype.getTopDownAttention = function(cdl_name) {
    var ci = this.codelet_infos.filter(function(ci) {
      return ci.klass.prototype.name === cdl_name
    })[0];
    if (ci) return ci.attention;
    else return 0;
  }

  MainBehavior.prototype.getBottomUpAttention = function(cdl_name) {
    var ci = this.codelet_infos.filter(function(ci) {
      return ci.klass.prototype.name === cdl_name
    })[0];
    if (ci) return this.cr.getCodeletTypeActivity(ci.klass);
    else return 0;
  }

  MainBehavior.prototype.getCombinedAttention = function(cdl_name) {
    var ci = this.codelet_infos.filter(function(ci) {
      return ci.klass.prototype.name === cdl_name
    })[0];
    if (ci) return this.att_getter(ci);
    else return 0;
  }

  MainBehavior.prototype.run = function() {
    if (this.cr.length > 0) return;
    this.updateAttentions();
    //console.log('before:', 1/this.expl_sum, 'now:', (this.expl_sum+this.unchecked_sum)/this.expl_sum);
    //if (this.ws.scene_pair_steps > Math.min(100, 1/this.expl_sum)) {
    var norm = this.expl_sum+this.unchecked_sum || 1;
    if (this.ws.scene_pair_steps > Math.min(100, norm/this.expl_sum)) {
      this.ws.advanceScenePair();
      this.updateAttentions();
    }
    var codelet_info = Random.pick_weighted(this.codelet_infos, this.att_getter);
    this.cr.insert(new codelet_info.klass(this.cr));
  }

  return { createWorkspace: createWorkspace
         , options: options
         , version: version
         };
});
