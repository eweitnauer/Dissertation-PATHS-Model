## launch python server
/usr/bin/osascript <<-EOF
tell application "iTerm"
    make new terminal
    tell the current terminal
        activate current session
        launch session "Default Session"
        tell the last session
            write text "cd '$(PWD)'"
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
        	write text "cd '$(PWD)'"
            write text "cd server"
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
        	write text "cd '$(PWD)'"
            write text "cd sites/test-suite"
            write text "phantomjs phantom-runner.js"
        end tell
    end tell
end tell
EOF
