

<!-- Start lib/env/adapter.js -->

## TerminalAdapter

`TerminalAdapter` is the default implementation of `Adapter`, an abstraction
layer that defines the I/O interactions.

It provides a CLI interaction

## prompt(questions, callback)

Prompt a user for one or more questions and pass
the answer(s) to the provided callback.

It shares its interface with `Base.prompt`

### Params: 

* **Array** *questions* 

* **Function** *callback* 

## diff(actual, expected)

Shows a color-based diff of two strings

### Params: 

* **string** *actual* 

* **string** *expected* 

<!-- End lib/env/adapter.js -->

