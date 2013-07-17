var pbpSettings = (function() {
	res = {
    max_dist: 0.06 // maximal distance of an objects to a spatial group to belong to it /* TODO: use this everywhere */
   ,activation_threshold: 0.5 /* TODO: use this everywhere */
   ,obj_attrs: {}
   ,obj_rels: {}
   ,group_attrs: {}
	};
	// object attributes
	[LeftAttribute,
	 LeftMostAttribute,
	 RightAttribute,
	 RightMostAttribute,
	 BottomAttribute,
	 TopAttribute,
	 TopMostAttribute,
	 OnGroundAttribute,
	 ShapeAttribute,
	 StabilityAttribute,
	 SmallAttribute,
	 LargeAttribute,
	 MovesAttribute,
	 MovableUpAttribute].forEach(function (attr) { res.obj_attrs[attr.prototype.key] = attr });
	// group attributes
	[CloseAttribute,
	 CountAttribute,
	 FarAttribute,
	 TouchAttribute
	].forEach(function (attr) { res.group_attrs[attr.prototype.key] = attr });
	// object relations
	[AboveRelationship,
	BelowRelationship,
	LeftRelationship,
	RightRelationship,
	BesideRelationship,
	FarRelationship,
	CloseRelationship,
	OnTopRelationship,
	TouchRelationship,
	HitsRelationship,
	GetsHitRelationship,
	CollidesRelationship,
	SupportsRelationship].forEach(function (rel) { res.obj_rels[rel.prototype.key] = rel });
	return res;
})();