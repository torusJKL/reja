# reja-server.janet
#
# Self-contained Janet netrepl server for use with Reja (VS Code extension).
#
# Origin: Adapted from Spork's netrepl.janet and msg.janet
# (https://github.com/janet-lang/spork)
#
# This file implements the server-side netrepl protocol for Janet REPL
# interaction. It uses only Janet's standard library.
#
# Changes from upstream Spork:
#   - Self-contained single file, no module dependencies
#   - Omitted all client/getline/rawterm code
#   - Uses sys/argv for port configuration
#   - Simplified to single-connection server mode
#
# For upstream netrepl see:
#   https://github.com/janet-lang/spork/blob/master/spork/netrepl.janet

### Message framing (msg.janet protocol)

(defn read-exactly
  "Read exactly n bytes from stream. Returns nil if insufficient data."
  [stream n bufsize]
  (def parts @[])
  (var remaining n)
  (while (> remaining 0)
    (def chunk (net/chunk stream (min bufsize remaining)))
    (when (or (nil? chunk) (= 0 (length chunk))) (break))
    (array/push parts chunk)
    (set remaining (- remaining (length chunk))))
  (if (= 0 remaining)
    (string/join parts)
    nil))

(defn decode-length
  "Decode a 4-byte little-endian integer from a string/buffer."
  [raw]
  (+ (get raw 0)
     (* (get raw 1) 256)
     (* (get raw 2) 256 256)
     (* (get raw 3) 256 256 256)))

(defn encode-length
  "Encode an integer as 4-byte little-endian string."
  [n]
  (string/from-bytes (band n 255)
                     (band (div n 256) 255)
                     (band (div n 65536) 255)
                     (band (div n 16777216) 255)))

(defn read-length
  "Read a 4-byte little-endian length prefix."
  [stream]
  (def raw (read-exactly stream 4 4))
  (if (and raw (= 4 (length raw)))
    (decode-length raw)
    nil))

(defn read-msg
  "Read a length-prefixed message from stream."
  [stream bufsize]
  (def len (read-length stream))
  (if len
    (read-exactly stream len bufsize)
    nil))

(defn send-msg
  "Send a length-prefixed message to stream."
  [stream msg]
  (net/write stream (encode-length (length msg)))
  (net/write stream msg))

### Evaluation

(defn eval-code
  "Evaluate Janet code and return the result as a string."
  [code env]
  (def out-buf (buffer))
  (def err-buf (buffer))
  (def f (fiber/new (fn []
    (with-dyns [:out out-buf :err err-buf]
      (eval-string code env))) :e))
  (def result (resume f))
  (if (= :dead (fiber/status f))
    (string/trim (string result))
    (string "error: " result)))

### Client handler

(defn handle-client
  "Handle a single client connection."
  [stream]
  (setdyn :out stream)
  (setdyn :err stream)
  (def bufsize 4096)
  (def env (curenv))
  (defn repl-prompt [line]
    (string "repl:" line ":> "))
  (defn read-next-msg []
    (read-msg stream bufsize))
  (defn send [msg]
    (send-msg stream msg))
  (var line-num 1)
  (defn responder [body]
    (def first-byte (get body 0))
    (def msg-body (string/slice body 1))
    (if (= 255 first-byte)
      (do (send (eval-code msg-body env)) false)  # \xFF eval — result only, no prompt
      (do
        (if (= 254 first-byte)
          (case msg-body
            "cancel" (send "cancelled")
            (send (string "unknown cmd: " msg-body)))
          (send (eval-code body env)))
        true)))  # raw \xFE or raw input — send prompt
  (def raw-client-name (read-next-msg))
  (def first-byte (get raw-client-name 0))
  (def client-name
    (if (= 255 first-byte)
      (do
        (def opts (eval-string (string/slice raw-client-name 1) env))
        (def name (get opts :name))
        name)
      raw-client-name))
  (send "\n## Reja REPL - Interactive Janet\n")
  (send (repl-prompt line-num))
  (while true
    (def msg (read-next-msg))
    (when (nil? msg) (break))
    (def send-prompt? (responder msg))
    (set line-num (+ line-num 1))
    (when send-prompt?
      (send (repl-prompt line-num)))))
 
### Server entry point

(defn run-server-single
  "Start REPL server, accept one connection, serve until disconnect."
  [port]
  (print "Starting networked repl server on port " port)
  (def listener (net/listen "127.0.0.1" port))
  (def client-stream (net/accept listener))
  (net/close listener)
  (def result (protect (handle-client client-stream)))
  (if (first result)
    (print "Client disconnected")
    (print "Server error: " (last result))))

(def port (scan-number (or (get (dyn :args) 1) "")))
(if (nil? port)
  (do
    (print "Usage: janet reja-server.janet <port>")
    (os/exit 1))
  (run-server-single port))
