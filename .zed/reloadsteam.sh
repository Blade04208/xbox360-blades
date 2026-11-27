#! /bin/bash
cp -r . ~/.local/share/Steam/millennium/themes/
if pgrep -x "steam" >/dev/null; then
    echo "restarting steam, hold on"
    steam -shutdown
    sleep 5
    steam -dev -tenfoot -windowed -openalldevtools
fi
