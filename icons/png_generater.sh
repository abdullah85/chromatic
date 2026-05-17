#/usr/bin/env bash

if [ -z $1 ]; then
    echo "The relative location of the image must be provided"
    exit -1;
fi
svg_file=$1
if [ ! -f $svg_file ]; then
    echo "The provided location ${svg_file} is not a file"
    exit -1;
fi

# echo $svg_file
fName=$(basename ${svg_file})
# Remove the svg file extension
fName=$(echo $fName | sed 's/.svg$//')
declare -a sizes=(16 32 48 64 128)
mkdir -p generated/$fName
for x in ${sizes[@]}; do
    echo inkscape $svg_file -w $x -h $x -o generated/$fName/icon_$x.png;
    inkscape $svg_file -w $x -h $x -o generated/$fName/icon_$x.png;    
    cp generated/$fName/icon_$x.png .
done
