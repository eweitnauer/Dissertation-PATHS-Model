Information Flow (in old version):

SVG ===PBP.load_file()===> pbp[scenes[objects=circle/polygon]] ===Box2DAdapter(dx,dy,scaling)===> b2World[b2Bodies[x,y,rot]]
Die pbp Datenstruktur wird per obj.synch_to_phys() an die aktuelle Simulation in Box2D angepasst. Die Methode ist im Box2DAdapter definiert.
