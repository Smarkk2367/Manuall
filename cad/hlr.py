import sys
import json
import os

try:
    import cadquery as cq
except ImportError:
    print("ERROR: CadQuery is not installed. Please install it.", flush=True)
    sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print("ERROR: No file provided", flush=True)
        sys.exit(1)

    file_path = sys.argv[1]
    output_dir = os.path.dirname(file_path)
    base_name = os.path.basename(file_path)
    job_id = base_name.split('.')[0] if '.' in base_name else base_name
    
    print("PROGRESS:10:Reading STEP file for HLR...", flush=True)
    
    try:
        assembly = cq.importers.importStep(file_path)
    except Exception as e:
        print(f"ERROR: Failed to load STEP file: {str(e)}", flush=True)
        sys.exit(1)

    print("PROGRESS:30:Extracting parts...", flush=True)

    solids = assembly.solids().vals()
    total_parts = len(solids)
    
    print(f"PROGRESS:40:Found {total_parts} parts to process", flush=True)

    parts_metadata = []

    opt = {
        "width": 400,
        "height": 400,
        "marginLeft": 20,
        "marginTop": 20,
        "projectionDir": (-1, -2, 0.5),
        "showHidden": False,
        "strokeWidth": 1.0,
        "strokeColor": (0, 0, 0)
    }

    for i, solid in enumerate(solids):
        progress = 40 + int((i / total_parts) * 50)
        print(f"PROGRESS:{progress}:Generating drawing for part {i+1}/{total_parts}...", flush=True)
        
        part_filename = f"{job_id}_part_{i}.svg"
        part_filepath = os.path.join(output_dir, part_filename)
        
        bb = solid.BoundingBox()
        center = bb.center
        centered_solid = solid.translate((-center.x, -center.y, -center.z))
        
        try:
            cq.exporters.export(centered_solid, part_filepath, exportType='SVG', opt=opt)
            parts_metadata.append({
                "id": i,
                "svg": part_filename,
                "bounds": {
                    "xlen": bb.xlen,
                    "ylen": bb.ylen,
                    "zlen": bb.zlen
                }
            })
        except Exception as e:
            print(f"ERROR: Failed to generate SVG for part {i}: {str(e)}", flush=True)

    print("PROGRESS:95:Saving parts metadata...", flush=True)
    
    meta_filepath = f"{file_path}_parts.json"
    with open(meta_filepath, 'w') as f:
        json.dump({"parts": parts_metadata}, f)

    print("PROGRESS:100:HLR Generation finished", flush=True)

if __name__ == "__main__":
    main()
