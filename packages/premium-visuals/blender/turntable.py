"""Blender turntable render (headless): blender -b -P turntable.py -- <model.glb|.blend|.obj> <out_dir> [frames=120] [res=1920]
Studio 3-point lighting, filmic/AgX view transform, 360-degree orbit, Cycles (GPU if available, else CPU)."""
import bpy, sys, math, os
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
model, out = argv[0], argv[1]
frames = int(argv[2]) if len(argv) > 2 else 120
res = int(argv[3]) if len(argv) > 3 else 1920
bpy.ops.wm.read_factory_settings(use_empty=True)
ext = os.path.splitext(model)[1].lower()
if ext in (".glb", ".gltf"): bpy.ops.import_scene.gltf(filepath=model)
elif ext == ".obj": bpy.ops.wm.obj_import(filepath=model)
elif ext == ".fbx": bpy.ops.import_scene.fbx(filepath=model)
elif ext == ".blend":
    with bpy.data.libraries.load(model) as (src, dst): dst.objects = src.objects
    for o in dst.objects: bpy.context.scene.collection.objects.link(o)
sc = bpy.context.scene
meshes = [o for o in sc.objects if o.type == "MESH"]
from mathutils import Vector
pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
centre, size = (mn + mx) / 2, max((mx - mn).length, 0.01)
pivot = bpy.data.objects.new("pivot", None); sc.collection.objects.link(pivot); pivot.location = centre
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam)
cam.data.lens = 50; cam.location = centre + Vector((0, -size * 1.8, size * 0.55)); cam.parent = pivot
c = cam.constraints.new("TRACK_TO"); c.target = pivot; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
sc.camera = cam
for name, loc, energy in (("key", (size*1.5, -size*1.5, size*2), 1200), ("fill", (-size*2, -size, size), 400), ("rim", (0, size*2, size*1.5), 900)):
    l = bpy.data.objects.new(name, bpy.data.lights.new(name, "AREA")); l.data.energy = energy * size * size; l.data.size = size
    l.location = centre + Vector(loc); sc.collection.objects.link(l)
    t = l.constraints.new("TRACK_TO"); t.target = pivot; t.track_axis = "TRACK_NEGATIVE_Z"; t.up_axis = "UP_Y"
world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.02, 0.02, 0.022, 1)
sc.frame_start, sc.frame_end = 1, frames
pivot.rotation_euler = (0, 0, 0); pivot.keyframe_insert("rotation_euler", frame=1)
pivot.rotation_euler = (0, 0, math.radians(360)); pivot.keyframe_insert("rotation_euler", frame=frames + 1)
for fc in pivot.animation_data.action.fcurves:
    for k in fc.keyframe_points: k.interpolation = "LINEAR"
sc.render.engine = "CYCLES"; sc.cycles.samples = 96; sc.cycles.use_denoising = True
try: sc.view_settings.view_transform = "AgX"
except TypeError: sc.view_settings.view_transform = "Filmic"
sc.render.resolution_x, sc.render.resolution_y = res, int(res * 9 / 16)
sc.render.image_settings.file_format = "PNG"; sc.render.filepath = os.path.join(out, "frame_")
bpy.ops.render.render(animation=True)
