import sys
import json
import time
import math

try:
    import cadquery as cq
except ImportError:
    print("ERROR: CadQuery is not installed. Please install it in the cad/ environment.", flush=True)
    sys.exit(1)

def compute_normals(vertices, indices):
    """
    Computes smooth normals for the given vertices and indices.
    """
    normals = [[0.0, 0.0, 0.0] for _ in range(len(vertices))]

    for i in range(0, len(indices), 3):
        i1 = indices[i]
        i2 = indices[i+1]
        i3 = indices[i+2]
        
        v1 = vertices[i1]
        v2 = vertices[i2]
        v3 = vertices[i3]

        ax, ay, az = v2[0]-v1[0], v2[1]-v1[1], v2[2]-v1[2]
        bx, by, bz = v3[0]-v1[0], v3[1]-v1[1], v3[2]-v1[2]
        
        nx = ay * bz - az * by
        ny = az * bx - ax * bz
        nz = ax * by - ay * bx
        
        normals[i1][0] += nx
        normals[i1][1] += ny
        normals[i1][2] += nz
        
        normals[i2][0] += nx
        normals[i2][1] += ny
        normals[i2][2] += nz
        
        normals[i3][0] += nx
        normals[i3][1] += ny
        normals[i3][2] += nz

    flat_normals = []
    for n in normals:
        length = math.sqrt(n[0]**2 + n[1]**2 + n[2]**2)
        if length > 0:
            flat_normals.extend([n[0]/length, n[1]/length, n[2]/length])
        else:
            flat_normals.extend([0.0, 0.0, 1.0])
            
    return flat_normals

def main():
    if len(sys.argv) < 2:
        print("ERROR: No file provided", flush=True)
        sys.exit(1)

    file_path = sys.argv[1]
    print("PROGRESS:10:Reading STEP file...", flush=True)
    
    try:
        shape = cq.importers.importStep(file_path)
    except Exception as e:
        print(f"ERROR: Failed to load STEP file: {str(e)}", flush=True)
        sys.exit(1)
        
    print("PROGRESS:40:Tessellating geometry...", flush=True)
    
    positions = []
    indices = []
    
    try:
        vertices, triangles = shape.val().tessellate(0.1)
        
        for v in vertices:
            positions.extend([v.x, v.y, v.z])
        for t in triangles:
            indices.extend([t[0], t[1], t[2]])
            
    except Exception as e:
        print(f"ERROR: Tessellation failed: {str(e)}", flush=True)
        sys.exit(1)

    print("PROGRESS:70:Computing normals...", flush=True)

    grouped_vertices = [ [positions[i], positions[i+1], positions[i+2]] for i in range(0, len(positions), 3) ]
    normals = compute_normals(grouped_vertices, indices)

    print("PROGRESS:90:Generating JSON...", flush=True)
    
    mesh_data = {
        "positions": positions,
        "normals": normals,
        "indices": indices
    }
    
    output_path = f"{file_path}.json"
    try:
        with open(output_path, 'w') as f:
            json.dump(mesh_data, f)
    except Exception as e:
        print(f"ERROR: Failed to write output JSON: {str(e)}", flush=True)
        sys.exit(1)
        
    print("PROGRESS:100:Finished", flush=True)

if __name__ == "__main__":
    main()
