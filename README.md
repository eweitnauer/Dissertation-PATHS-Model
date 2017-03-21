# PATHS

PATHS (Perceiving and Testing Hypotheses on Structured data) is the cognitive process model that I developed as part of my PhD thesis. It learns concepts from sets of physical scenes. 

Here is a screen shot of the interface that you can use [here](https://graspablemath.com/projects/paths).
![image](https://cloud.githubusercontent.com/assets/53043/24169452/0d0df5f4-0e54-11e7-96b0-b2e17152f113.png)

(1) The learning task. The goal is to come up with the difference between all scenes on the left and all scenes on the right. In this example, in the scenes on the left, there is always a single object, while on the right there are always two objects. The difference can be based on a physical property like imagined movement of the objects, too. Hover over a scene and click the play button to see the physics unfold.

(2) The model. When you click the "Run" button, the PATHS model is presented with two scenes at a time and will do two things simultaneously: preceiving the scenes and coming up with / checking solution hypotheses. After a while it will automatically switch to the next two scenes.

(3) A list of hypothesis. These are the hypotheses PATHS came up with. Click on one to see how it holds up with the scenes of the problems. The hypotheses that PATHS estimates to be most likely to be part of the solution are at the top.

(4) A list of object features and relationships. These are the basic concepts that PATHS knows about and will iteratively perceive in the scenes. Click a feature to increase the likelihood for checking that feature first.

Here is the abstract from the thesis:

> Concepts are central to human cognition and one important type of concepts can be represented naturally with symbolic rules. The learning of such rule-based concepts from examples relies both on a process of perception, which extracts information from the presented examples, and a process of concept construction, which leads to a rule that matches the given examples and can be applied to categorize new ones. This thesis introduces PATHS, a novel cognitive process model that learns structured, rule-based concepts and takes the active and explorative nature of perception into account. In contrast to existing models, the PATHS model tightly integrates perception and rule construction. The model is applied to a challenging problem do- main, the physical Bongard problems, and its performance under different learning conditions is analyzed and compared to that of human solvers.

Erik Weitnauer, 2017.
