var pbpSettings = {
/* TODO: use this everywhere */ max_dist: 0.06 // maximal distance of an objects to a spatial group to belong to it
/* TODO: use this everywhere */,activation_threshold: 0.5
 ,attrs: {
 	  //'count': CountAttribute // TODO: this is a group attribute and must be treated differently
    'left_pos': LeftAttribute
	 ,'right_pos': RightAttribute
	 ,'bottom_pos': BottomAttribute
	 ,'top_pos': TopAttribute
	 ,'top_most': TopMostAttribute
	 ,'on_ground': OnGroundAttribute
	 ,'shape': ShapeAttribute
	 ,'stability': StabilityAttribute
	 ,'small': SmallAttribute
	 ,'large': LargeAttribute
	 ,'moves': MovesAttribute
 }
 ,rels: {
	  'above': AboveRelationship
	 ,'below': BelowRelationship
	 ,'left': LeftRelationship
	 ,'right': RightRelationship
	 ,'beside': BesideRelationship
	 ,'far': FarRelationship
	 ,'close': CloseRelationship
	 ,'ontop': OnTopRelationship
	 ,'touch': TouchRelationship
 }
}