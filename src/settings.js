var pbpSettings = (function() {
	res = {
    max_dist: 0.06 // maximal distance of an objects to a spatial group to belong to it /* TODO: use this everywhere */
   ,activation_threshold: 0.5 /* TODO: use this everywhere */
   ,attrs: {}
   ,rels: {}
	};
	// attributes
	[LeftAttribute,
	 RightAttribute,
	 BottomAttribute,
	 TopAttribute,
	 TopMostAttribute,
	 OnGroundAttribute,
	 ShapeAttribute,
	 StabilityAttribute,
	 SmallAttribute,
	 LargeAttribute,
	 MovesAttribute].forEach(function (attr) { res.attrs[attr.prototype.key] = attr });
	// relations
	[AboveRelationship,
	BelowRelationship,
	LeftRelationship,
	RightRelationship,
	BesideRelationship,
	FarRelationship,
	CloseRelationship,
	OnTopRelationship,
	TouchRelationship].forEach(function (rel) { res.rels[rel.prototype.key] = rel });
	return res;
})();