## 0. introduction to the domain of PBPs
  - reference & take inspiration from my original PBP paper

Each scene in a PBP can be interpreted in many different ways. The task of solving a PBP, which entails identifying a category that contains all scenes from one side only, can also be seen as the task of finding a single interpretation that is common to all scenes. The PI algorithm is therefore about creating interpretations, and focusing the search on promising ones.

## Main Design Decisions

Bounded rationality. The general design and restrictions of the model are based on what we know about humans. Then, given the resulting capabilities, the program should make the best possible decision at each point in time.

1. Modelling the hypothesis space as structured scene descriptions that either match a subset of objects in a scene or not. These descriptions are disjunctions of object attributes, group attributes and object relationships.
2. Based on the observation that it is typically much simpler to check a solution by applying the category description to each scene than coming up with a solution, the algorithm focusses on creating many potentially correct interpretations and filtering the bad ones by applying them to the scenes. 
3. Perception-driven: Initially, the algorithm does not know anything about the objects in the scenes, it first has to perceive them. There is a cost of perceiving an attribute. The hypotheses are built up over time based on those perceptions.
4. Sequential operation & memory limitations: The algorithm is only allowed to look at a single scene pair at a time. When a new hypothesis is formed, it cannot be checked on previously seen scenes, but just on the currently visible ones. This means that the decision of which hypothesis to explore further needs to take into account that different hypotheses were typically checked on different scenes and different numbers of scenes. While the algorithm keeps track of all created hypotheses, typically only a few hypotheses are explored at the same time. Only when a promising hypothesis turns out to be wrong, attention is shifted to others.
5. Stochastical, rational decisions: The algorithm uses the information of which scenes each hypotheses matched or mis-matched combined with biases as source of information to estimate which hypotheses, features and objects in a scene are most likely to be part of the solution. Based on those estimates, it makes stochastical decisions on what to perceive or check next.

## 1. high-level description of one run of the program

We will first give a high-level description of how the Physics Interpreter (PI) works on a PBP and describe the details of the terms we introduce later. When the PI starts working on a PBP, the first step is to load all the scenes which are provided as SVG images into memory. The objects and the ground in each scene are represented as polygons, with coordinates for each points in their outlines. At each point in time two scenes the PBP are visible and any actions can only be performed on those scenes. There is a predefined pair sequence through all the PBP's scenes and the PI can decide when to switch to the next pair, cycling back to the first pair after last one was seen.

Initially, the PI knows nothing about any of the objects. To gather information, it will select objects in the scenes and features, like *large* or *square*, and perceive the feature on the object. When a new perception is made, a structured scene description (*selector*) based on the perception is created. In our example, a "large objects" selector would be created. This selector is applied to both scenes in the currently visible scene pair, resulting in a number of objects in both scenes that match the selector. These results are captured in a solution *hypothesis*, which represents a potential solution or potential part of a solution.

After switching to the next scene pair, besides perceiving further features on the objects in the scene, the PI can now also check existing *hypotheses* on the scenes to gather new evidence that change the likelihood of the *hypothesis* being a solution. The only other action the PI can take is combining of existing *hypotheses*, in fact their underlying *selectors*, to build more complex descriptions. For example, the *selector* "large object" and the *selector* "small object on top of object" can be combined into "small object on top of large object".

The type of the next action is stochastically chosen from a fixed multinomial distribution. The elements the chosen action is acting on are determined stochastically based on the information the PI already has about how well existing hypotheses match all scenes they were checked on. More promising hypotheses will be checked first; objects and features that play a role in promising hypotheses will be picked with a higher probability for perceiving further features.

The PI stops as soon as one hypothesis was checked on all scenes and is a solution, in fact matches all scenes from one side and none of the scenes from the other side. In case no solution is found, the search is aborted after a fixed number of steps.

## 2. describe all the terms introduced in 1. in more details, including

### Terminology

Whenever in the descriptions below we write that a *hypothesis*, *object*, *group* or *feature* is selected by the algorithm, this selection is always done as a stochastical choice over all candidates weighted by their activity values. We will outline the (bayesian) activity system in a separate section below.

*Scenes.* Each scene holds physical representations of all its objects. A physics engine is used to both predict how the scene unfolds over time and to perceive physical features like the stability of objects.

*Objects.* An object keeps track of all perceptions that were made on that object. *Groups* are sets of objects that are the result of one or several selectors like "squares" or "any object".

*Selectors* represent a specific interpretation of a scene by describing what to look for. They can be applied to a scene and will select a subset of the scene's objects if they match or no object if they don't match. Each selector has a complexity value based on the number and type of features it is based on. The structure of each selector is a disjunction of attribute or relationship percepts. Each relationship has an attribute-based target selector that chooses the target object of that relationship. For example: "a small object that hits a big rectangular object".

*Hypotheses* are potential solutions or parts of solutions to the PBP. Each hypothesis is based on a selector and keeps track of which scenes matched or mismatched the selector. Each hypothesis has an activity based on an estimate of how probable it is that it is the correct solution.

*Features and Percepts.* PI has 33 inbuilt features, including static object properties like size and shape, physical properties like stability and movement, spatial relationships like 'left-of' or 'close' and group attributes like object count. Each feature represents a mechanism by which it can be perceived on any object or object group and the resulting percept keeps track of the object or group it was perceived on, the time it was perceived at and the value of the feature. Internally, the values are stored as a membership degree between 0 and 1. The algorithm then uses a fixed threshold of 0.5 to decide whether a feature is present or not (object A is or is not left of object B).

The *perceive feature action* does on of two things with equal probability. It either first selects an object or group from one of the current scenes and second selects which new feature it should perceive on the object or group. Or, it first selects a feature based and then a new target to perceive the feature on. Both feature and target are chosen stochastically based on the feature and object activations. After a new percept was generated, in the next step a new hypothesis is created and checked.

The *check hypothesis action* stochastically selects a hypotheses that was not checked on the current scenes yet and checks which of the scenes match.

The *combine hypotheses action* selects an object and merges two of the selectors that select that object. The resulting selector is turned into a new hypothesis and checked in the next step.

## 3. describe the activity system and how it is based in probabilities

Whenever the algorithm is selecting a hypotheses to check or combine, or an object and feature to perceive, the choice is made stochastically based on the results of matching existing hypotheses against scenes. While seeing a lot of circles is not be very telling in itself, but if those circles are only found in left scenes, it should give some credibility to circles being part of a solution to the problem.

We'll represent the matching results of all hypotheses that are considered by the algorithm at any particular point in time as a matrix `M`. The columns correspond to hypotheses, the rows to the scenes of the PBP and each element `m_i,j` in the matrix is set to `1` if hypothesis `h_j` matched scene `s_i`, `0` if it didn't and is blank it was not tested on the scene yet.

We estimate the probability of an hypotheses being the solution or part of a solution using the following heuristic:

In case `h_i` might still be a solution, in fact all tested scenes that matched were from one side and all that didn't match from the other, we set `P(h_i|M) = 0.5^(blank) * P0(h_i)`, where `blank` is the number of scenes on that `h_i` was not tested on so far and `P0(h_i)` is a measure of complexity for `h_i` and acts as a prior. In pratice, this ensures that the more scenes an hypothesis is successfully checked on, the more probable it gets.

In case `h_i` can't be a solution but still might be part of a combined, disjunctive solution, we set `P(h_i|M) = 0.5^(blank+S/2+incomp) * P0(h_i)`, where `S/2` is a fixed penalty set to half the total scene count and `incomp` is the number of scene matches / mismatches that are incompatible with `h_i` being a solution itself. In the special case, where a hypothesis matches *all* scenes on both sides and is based on base-level-features (shape and size in our case), we set `incomp=0`. In practice, this makes hypotheses that are close to being a solution more probable than ones that are farther off, while accounting for the special situation in which the "same" object is showing up in each scene.

Finally, in case a solution can't be part of a solution, its probability is set to `0`.

The probability that any particular feature or object plays a role in a solution is estimated based on the probabilities of all current hyptheses and a prior. `P(x|M) = SUM_i(P(h_i | M)) * P0(x) * Z` where `x` is an object or feature, `P(h_i | M)` is the estimated probability of hypothesis `i`, `P0(x)` is the prior probability of the feature or object and `Z` is a normalization factor. The relative priors for features are `3` for shape and size attributes, `2` for movement and stability and `1` for all others -- reflecting the belief that, e.g., size will play a role in PBPs three times as often as, e.g., any spatial relationship. The relative priors for objects depend on the attributes that were perceived on each object so far and attriubte more probability to moving, top-most and spatially separated objects.


## Results

We ran the algorithm on 14 different PBPs, which were all solvebale by the algorithm in principle. Each PBP consists of 16 scenes that are devided into four groups of four scenes, such that scenes within a group are in average more similar to each other than scenes  between groups. During learning, the scenes were shown two at a time to the algorithm in a one of eight different orders. TEXT & PICS FROM PREVIOUS PAPER.
For each of those eight conditions, the algorithm was run 100 times.

Figure with results.

## Comparison to Human Performance

In previous studies, Weitnauer, Carvalho et. al. (2014), had human subjects solve a superset of the PBPs presented to the algorithm. The same order of scene pairs and presentation conditions were used. For sequential presentation of the scenes we found a significant main effect of the interleaved schedule being better than the blocked schedule. This main effect resulted from an expected advantage of comparing similiar scenes between categories as opposed to comparing dissimilar scenes between categories. In a second study in which the scenes were shown simultaneously, yet arranged according to the similarity conditions, we found the expected effect that low within-category similarity is better than high within-category similarity.

Our algrithm is reproducing both effects, the advantage of comparing high-similarity scenes between categories and the advantage of comparing low-similarity scenes within categories.


## Discussion

The presented algorithm

* showed similar qualitative behavior as the human subjects

It might be worth pointing out that the way our algorithm works might provide a different perspective to the process of analogy-making. Instead of listing potential 1:1 correspondences between elements of two scenes and building a structured mapping between the scenes on top of them, our algorithm starts by building increasingly complex interpretations of one of the two scenes. During this process, it rules out interpretations that do not work well for the other scene. In case it does eventually come up with a good shared interpretation, the 1:1 object correspondences will often naturally fall out of applying the interpretation to both scenes. Cases in which they don't are cases in which there were no meaningful 1:1 correspondences between the examples under the given interpretation anyway (e.g, "all objects are close to each other").

We have to admit that we find the current seemingly ad-hoc way of introducing the heuristics for estimating probabilities of hypotheses, objects and features dissatisfying. The algorithm could provide more insight were those probabilities following from a rigid Bayesian derivation based on overt assumptions about the structure of the solution space and prior beliefs. We are, in fact, working on such a derivation and several of the algorithm's heuristics do follow naturally from reasonable assumptions. We look to extending these results and presenting them in further publications.

<!-- The matching results of selectors are the main source of information about what is a good search direction. The more scenes a selector is matching on one side while it is not matching any scenes on the other side, the more promising it is. The formula for the estimated likelihood of a hypothesis is
`2^-(unchecked+complexity)` for one-sided selectors; `2^-(unchecked+complexity+scene_pairs+incompatible)` for two-sided selectors and `2^-(unchecked+complexity+scene_pairs)` for two-sided selectors that are match all scenes and only contain base-level features.

The formula for the estimated likelihood of an object is
`P(obj) = prior(obj) * (Σ_i(P(hyp_i)) + base)`, where the sum is over all hypotheses that select the object and `base` is accounting for the possibility that the correct hypothesis is not among the currently considered ones, it is `0.1`. The `prior` values are a product of priors associated to a small number of features like "moves"=2 or "single"=1.5. Thes priors reflect the belief that, e.g., moving object are more often part of a solution that static objects.

The formula for the likelihood of a feature is
`P(feat) = prior(feat) * (Σ_i(P(hyp_i)) + base)` where the sum is over all hypotheses that use the feature and `base` is accounting for the possibility that the correct hypothesis is not among the currently considered ones, it is `0.1`. The `prior` values are chosen to be either `3z`, `2z` or `z` where `z` is chosen so they add up to `1`. They are `3z` for shape and size attributes as these are base-level features that are easily perceived and commonly used by humans. Moves and stability have the `2z` prior while all other features have a prior of `z`.
 -->






PI ... physics interpreter
PAI ... physical/probabilistic analogy interpreter
PAM ... physical/probabilistic analogy maker
SAM ... scene analogy maker
PSI ... physical/probabilistic scene interpreter
BARF ... bayesian analogical rule finder
