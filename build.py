import os
import subprocess
import json
import sys
import re

# Define the lists of JS files to concatenate
js_files_lists = [
    {
        "output_filename": "litegraph.core.js",
        "pack_filename": "litegraph.core.pack.js",
        "js_files": [    
            "./src/litegraph.js",
        ]
    },
    {
        "output_filename": "litegraph.mini.js",
        "pack_filename": "litegraph.mini.pack.js",
        "js_files": [    
            "./src/litegraph.js",
            
            "./src/nodes/base.js",
            "./src/nodes/events.js",
            "./src/nodes/input.js",
            "./src/nodes/math.js",
            "./src/nodes/strings.js",
            "./src/nodes/logic.js",
            "./src/nodes/network.js",
        ]
    },
    {
        "output_filename": "litegraph.full.js",
        "pack_filename": "litegraph.full.pack.js",
        "js_files": [
           "./src/litegraph.js",
           
            "./src/nodes/base.js",
            "./src/nodes/events.js",
            "./src/nodes/interface.js",
            "./src/nodes/input.js",
            "./src/nodes/math.js",
            "./src/nodes/math3d.js",
            "./src/nodes/strings.js",
            "./src/nodes/logic.js",
            "./src/nodes/graphics.js",
            "./src/nodes/gltextures.js",
            "./src/nodes/glshaders.js",
            "./src/nodes/geometry.js",
            "./src/nodes/glfx.js",
            "./src/nodes/midi.js",
            "./src/nodes/audio.js",
            "./src/nodes/network.js",
        ]
    },
]

# Specify the build folder
build_folder = "build"
# Function to concatenate JS files
def concatenate_js_files(js_files, output_filename):
    concatenated_data = "// readable version"
    for js_file in js_files:
        print("Processing " + js_file + " ", end="")
        try:
            with open(js_file, "r") as f:
                concatenated_data += f.read() + "\n"
                print("\033[92mOK\033[0m")
        except FileNotFoundError:
            print("\033[91mJS File not found\033[0m")

    # Write the concatenated data to the output file
    with open(os.path.join(build_folder, output_filename), "w") as output_file:
        output_file.write(concatenated_data)
        print("Concatenated JS files saved to: " + output_filename)

def pack_js_files(js_files, output_filename):
    concatenated_data = "/*packed*/"
    uglifyjs_path = os.path.join(".", "node_modules", ".bin", "uglifyjs" + (".cmd" if sys.platform.startswith('win') else ""))
    for js_file in js_files:
        print("Processing " + js_file + " ", end="")
        
        if os.path.exists(js_file):
            # Minify the JS file using uglifyjs
            minified_js = subprocess.run([uglifyjs_path, js_file, "-c"], stdout=subprocess.PIPE, text=True)
            concatenated_data += minified_js.stdout + "\n"
            print("\033[92mMinified\033[0m")
        else:
            print("\033[91mJS File not found\033[0m")

    # Write the concatenated data to the output file
    with open(os.path.join(build_folder, output_filename), "w") as output_file:
        output_file.write(concatenated_data)
        print("Concatenated and minified JS files saved to: " + output_filename)

def update_version(version, command=""):
    if "--minor" in command:
        version_parts = version.split('.')
        version_parts[1] = str(int(version_parts[1]) + 1)
        version_parts[2] = '0'
        version = '.'.join(version_parts)
    elif "--major" in command:
        version_parts = version.split('.')
        version_parts[0] = str(int(version_parts[0]) + 1)
        version_parts[1] = '0'
        version_parts[2] = '0'
        version = '.'.join(version_parts)
    else:
        version_parts = version.split('.')
        version_parts[2] = str(int(version_parts[2]) + 1)
        version = '.'.join(version_parts)

    return version

def update_version_in_files(version, files):
    for file_path in files:
        try:
            with open(file_path, 'r') as file:
                data = file.read()
                data = re.sub(r'("version": )"\d+.\d+.\d+"', r'\1"{}"'.format(version), data)
                data = re.sub(r'(this.VERSION = )"\d+.\d+.\d+";', r'\1"{}";'.format(version), data)
            with open(file_path, 'w') as file:
                file.write(data)
                print("Version updated in file: " + file_path)
        except FileNotFoundError:
            print("File not found: " + file_path)

def get_version_from_package_json():
    try:
        with open('package.json', 'r') as file:
            data = json.load(file)
            return data.get('version')
    except (FileNotFoundError, json.JSONDecodeError):
        sys.exit()

def get_new_version():
    # Specify the version number and files to update
    version_number = get_version_from_package_json()

    if "--minor" in sys.argv:
        version_number = update_version(version_number, "--minor")
    elif "--major" in sys.argv:
        version_number = update_version(version_number, "--major")
    else:
        version_number = update_version(version_number)
    return version_number

# Create build folder if it does not exist
if not os.path.exists(build_folder):
    os.makedirs(build_folder)

# Concatenate JS files from each list and save to the respective output filenames
for js_files_list in js_files_lists:
    concatenate_js_files(js_files_list["js_files"], js_files_list["output_filename"])
    pack_js_files(js_files_list["js_files"], js_files_list["pack_filename"])

files_to_update = ["src/litegraph.js", "package.json"]

# Update the version number in the specified files
update_version_in_files(get_new_version(), files_to_update)