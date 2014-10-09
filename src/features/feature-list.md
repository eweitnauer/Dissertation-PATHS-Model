Implemented features:

  * object attributes
    * stability (moving, unstable, slightly unstable, stable)
    * shape (circle, square, rectangle, triangle)
    * size (small, large)
    * moves
    * single (is not touching any other object)
    * on-ground
    * left, right, bottom, top (of scene)
    * movable-up
  * group attributes
    * count
    * close
    * far
    * touch
  * object relationships
    * touch
    * close
    * far
    * left-of, right-of, besides
    * above, below
    * on-top-of
    * supports
    * hits, gets-hit-by, collides-with

I also have a nice single-linkage clustering algorihms that returns all objects grouped into spatial clusters.

About half of the features above use Box2D, either for simulating physics, or for fast calculation of distances between polygons. Many of the features return gradual values of membership.

Here are the biggest things that I think this code base would add, beside the obvious value of having a lot of features that are ready to use:

  * all features (except the shape feature) work accurately for any shapes
  * gradual responses for many of the features, allowing for gradual instead of yes-no feedback on concept-membership
  * its possible to have dynamics- & physics-based features
  * there is code that can parse svg images into physcial scenes, allowing to design problems in a drawing program like Inkscape
  * powerful base for implementing new features

The main downside to the approach that I see is the work it will take to integrate it into the experiment code. It is certainly overkill if all we are interested in are static (non-physical) scenes and a few simple yes-no features to check in them.