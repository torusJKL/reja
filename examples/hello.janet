# Reja Example - Hello Janet
# Open this file and try:
#   Alt+Enter  - evaluate top-level form
#   Ctrl+Enter - evaluate enclosing form
# Select text and run "Reja: Evaluate Selection"

(defn greet
  "Say hello to someone."
  [name]
  (string "Hello, " name "!"))

(greet "World")

(defn fibonacci
  "Calculate nth Fibonacci number."
  [n]
  (if (<= n 1)
    n
    (+ (fibonacci (- n 1)) (fibonacci (- n 2)))))

(for i 0 10
  (print (fibonacci i)))
