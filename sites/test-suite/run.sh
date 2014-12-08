## launch python server
/usr/bin/osascript <<-EOF
tell application "iTerm"
    make new terminal
    tell the current terminal
        activate current session
        launch session "Default Session"
        tell the last session
        	write text "cd code/erik_diss"
            write text "python -m SimpleHTTPServer"
        end tell
    end tell
end tell
EOF

## launch mongodb script
/usr/bin/osascript <<-EOF
tell application "iTerm"
    make new terminal
    tell the current terminal
        activate current session
        launch session "Default Session"
        tell the last session
        	write text "cd code/erik_diss/server"
            write text "node server.js"
        end tell
    end tell
end tell
EOF

## launch phantomjs
/usr/bin/osascript <<-EOF
tell application "iTerm"
    make new terminal
    tell the current terminal
        activate current session
        launch session "Default Session"
        tell the last session
        	write text "cd code/erik_diss/sites/test-suite"
            write text "phantomjs phantom-runner.js"
        end tell
    end tell
end tell
EOF