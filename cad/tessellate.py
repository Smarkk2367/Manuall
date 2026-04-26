import sys
import time
import os

def main():
    if len(sys.argv) < 2:
        print("ERROR: No file provided")
        sys.exit(1)

    file_path = sys.argv[1]
    
    #Simulate processing
    print("PROGRESS:10:Reading STEP file...", flush=True)
    time.sleep(1)
    
    print("PROGRESS:50:Tessellating geometry...", flush=True)
    time.sleep(1)
    
    print("PROGRESS:90:Generating JSON...", flush=True)
    time.sleep(1)
    
    #Write a dummy JSON file
    output_path = f"{file_path}.json"
    with open(output_path, 'w') as f:
        f.write('{"vertices": [], "normals": [], "indices": []}')
        
    print(f"PROGRESS:100:Finished", flush=True)

if __name__ == "__main__":
    main()
