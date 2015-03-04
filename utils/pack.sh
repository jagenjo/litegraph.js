cd "$(dirname "$0")"
python builder.py deploy_files.txt -o ../build/litegraph.min.js -o2 ../build/litegraph.js --nomin
chmod a+rw ../build/* 
