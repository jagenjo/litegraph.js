cd "$(dirname "$0")"
python3 builder.py deploy_files.txt -o ../build/litegraph.min.js -o2 ../build/litegraph.js "$@"
chmod a+rw ../build/* 
